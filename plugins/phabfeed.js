const fs = require('fs');
const https = require('https');
const querystring = require('querystring');
const irc = require('irc');

module.exports = function (bot) {
    var plugin = this;

    var phabKeyFilename = bot.config.get('plugins.phabfeed.ckeyfile', './db/lastSeenPhabKey.txt');
    var phabApiToken = bot.config.get('plugins.phabfeed.apitoken', '');
    var phabServer = bot.config.get('plugins.phabfeed.server', '');
    var phabInterval = bot.config.get('plugins.phabfeed.fetchinterval', '10');
    var phabOutputs = bot.config.get('plugins.phabfeed.outputs');
    var tag = bot.config.get('plugins.phabfeed.tag', 'Phabricator');
    var tagColour = bot.config.get('plugins.phabfeed.tagcolour', 'dark_green');
    var autoStartFetch = bot.config.get('plugins.phabfeed.autostart', 'false');

    var fetchInterval;
    var before = 0;
    var fetching = false;

    if (phabApiToken == '') {
      bot.error('Phabricator API-Token not present in configuration file');
      return;
    }
    if (phabServer == '') {
      bot.error('Phabricator server address not present in configuration file');
      return;
    }

    if (autoStartFetch) {
      startAutoFetch();
    }

    const msgPrefix = '[' + irc.colors.wrap(tagColour, tag) + '] '

    function setLastSeen(chronoKey = null) {
      if (chronoKey || chronoKey === 0) {
          bot.log('Changing Last Seen ChronologicalKey');
          before = chronoKey;
          fs.writeFileSync(phabKeyFilename, before);
      } else {
        try {
          before = fs.readFileSync(phabKeyFilename, "utf-8");
        } catch (err) {
          var fd = fs.openSync(phabKeyFilename, 'w');
          fs.closeSync(fd);
          before = 0;
        }
      }
    }

    plugin.addCommand(['pf', 'phabfeed'], function (cmd) {
      //if (bot.config.get('admins').indexOf(cmd.nick) == -1) return;
      var args = cmd.args.split(/\s+/);

      switch(args[0]) {
        case 'help':
          cmd.transport.say(cmd.replyto, 'Phabricator feed monitor commands:');
          cmd.transport.say(cmd.replyto, 'start, stop - Change timed fetching state.');
          cmd.transport.say(cmd.replyto, 'interval <minutes> - Change time between feed readings.');
          break;
        case 'fetch':
          fetchFeed(cmd.transport.name, cmd.replyto);
          break;
        case 'interval':
        case 'time':
          phabInterval = args[1];
          if (!fetching) {
            cmd.transport.say(cmd.replyto, 'Setting read interval to ' + phabInterval + ' minutes.');
            break;
          } else {
            stopAutoFetch();
          }
          // else fall through case to restart
        case 'start':
          cmd.transport.say(cmd.replyto, 'Starting to read ' + phabServer + ' every ' + phabInterval + ' minutes.');
          startAutoFetch();
          break;
        case 'stop':
          cmd.transport.say(cmd.replyto, 'Stopping reads of ' + phabServer);
          stopAutoFetch();
          break;
        // Debugging utility commands
        case 'setseen':
          setLastSeen(args[1]);
          cmd.transport.say(cmd.replyto, 'Setting last seen ChronologicalKey to ' + before);
          break;
        case 'clearseen':
          setLastSeen(0);
          break;
      }
    });

    function startAutoFetch() {
      fetching = true;
      bot.log('Beginning Phabricator Feed Fetching');
      fetchInterval = setInterval(function(){
        for (transport in phabOutputs) {
          fetchFeed(transport, phabOutputs[transport]);
        }
      }, phabInterval * 60000);
    }

    function stopAutoFetch() {
        clearInterval(fetchInterval);
        fetchInterval = null;
        fetching = false;
    }

    function phidRequest(phidList, callback) {
      var numPhids = 0;
      var queryObj = {
        'api.token': phabApiToken
      }
      for (phid in phidList) {
        queryObj['names[' + numPhids + ']'] = phidList[phid];
        numPhids += 1;
      }
      var phidQuery = querystring.stringify(queryObj);
      var options = {
        hostname: phabServer,
        path: '/api/phid.lookup',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(phidQuery)
        }
      };
      var phidBuffer = "";
      var retLookupTable;
      const pReq = https.request(options, function (res){
        res.on('data', function (chunk) {
          phidBuffer += chunk.toString();
        });
        res.on('end', function (){
          jsonPhids = JSON.parse(phidBuffer);
          //TODO Handle errors
          callback(jsonPhids.result);
        });
      });
      pReq.write(phidQuery);
      pReq.end();
    }

    function gatherPhids(results) {
      var phidList = [];
      for (item in results) {
        phidList.push(results[item].authorPHID);
        phidList.push(results[item].objectPHID);
      }
      return phidList;
    }

    function fetchFeed(network, target){
      var respBuffer = "";
      setLastSeen();
      if (before == '') { before = 0; }
      feedQuery = querystring.stringify({
        'api.token': phabApiToken,
        'before': before,
        'view': 'text'
      });

      var options = {
        hostname: phabServer,
        path: '/api/feed.query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(feedQuery)
        }
      };
      const req = https.request(options, function (res) {
        res.on('data', function (chunk) {
          respBuffer += chunk.toString();
        });
        res.on('end', function () {
          //TODO handle error responses
          var newestResponse = true;
          var jsonResp = JSON.parse(respBuffer);
          var phidlist = gatherPhids(jsonResp.result);
          phidRequest(phidlist, function (phidDict) {
            for(var phid in jsonResp.result) {
              const author = phidDict[jsonResp.result[phid].authorPHID].fullName;
              const tasktext = phidDict[jsonResp.result[phid].objectPHID].fullName;
              const taskuri = phidDict[jsonResp.result[phid].objectPHID].uri;
              const msg = author + " - " + tasktext + " - " + taskuri;
              plugin.transports[network].say(target, msgPrefix + msg);
              //log the chronokey
              if (newestResponse) {
                setLastSeen(jsonResp.result[phid].chronologicalKey);
                newestResponse = false;
              }
            }
           });
        });
      });
      req.write(feedQuery);
      req.end();
    }
};
