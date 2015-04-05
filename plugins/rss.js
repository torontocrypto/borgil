var FeedParser = require('feedparser');
var request = require('request');
var util = require('util');


var feeds = [];

var defaultInterval = 10;
var intervalObj = null;


module.exports = function (bot) {
    function fetch(feed) {
        bot.log('Fetching feed "%s" from %s', feed.name, feed.url);

        var parser = new FeedParser({});

        // add cache validation headers
        var headers = {};
        if (feed.etag) {
            bot.log('Sending saved etag %s for feed "%s"', feed.etag, feed.name);
            headers['If-None-Match'] = feed.etag;
        }
        if (feed.last_modified) {
            bot.log('Sending saved last-modified date "%s" for feed "%s"', feed.last_modified, feed.name);
            headers['If-Modified-Since'] = feed.last_modified;
        }

        request.get({
            url: feed.url,
            headers: headers
        })
        .on('error', function (e) {
            bot.error('RSS request error:', e.message);
        })
        .on('response', function (res) {
            bot.log('Received %d response from feed "%s"', res.statusCode, feed.name);

            if (res.statusCode == 304) return;
            if (res.statusCode != 200) return this.emit('error', new Error('Bad RSS status code: ' + res.statusCode));

            // save cache validation headers
            if (res.headers.etag) {
                bot.log('Saving etag %s for feed "%s"', res.headers.etag, feed.name);
                feed.etag = res.headers.etag;
            }
            if (res.headers['last-modified']) {
                bot.log('Saving last-modified date "%s" for feed "%s"', res.headers['last-modified'], feed.name);
                feed.last_modified = res.headers['last-modified'];
            }

            this.pipe(parser);
        });

        parser
        .on('error', function (e) {
            bot.error('RSS parser error:', e.message);
        })
        .once('readable', function () {
            item = this.read();
            bot.say(feed.network, feed.target, util.format('%s | %s', item.title, item.link));
        });
    }


    function fetchAll() {
        bot.log('Fetching RSS feeds...');
        feeds.forEach(function (feed) {
            fetch(feed);
        });
    }


    bot.addCommand('rss', function (cmd) {
        switch(cmd.args[0]) {
        case 'quick':
            fetch({
                name: '',
                url: cmd.args[1],
                network: cmd.network,
                target: cmd.replyto,
            });

            break;

        case 'add':
            var name = cmd.args[1],
                url = cmd.args[2];

            feeds.push({
                name: name,
                url: url,
                network: cmd.network,
                target: cmd.replyto,
            });
            bot.say(cmd.network, cmd.replyto, 'Added 1 feed.');

            break;

        case 'del':
        case 'delete':
        case 'remove':
        case 'rm':
            feeds = feeds.filter(function (feed) {
                if (cmd.args[1] == feed.name || cmd.args[1] == feed.url) {
                    bot.say(cmd.network, cmd.replyto, 'Removed 1 feed.');
                }
                else return true;
            });

            break;

        case 'list':
            var all = cmd.args[1] == 'all';
            var feedlist = all ? feeds : feeds.filter(function (feed) {
                return cmd.network == feed.network && cmd.replyto == feed.target;
            });

            bot.say(cmd.network, cmd.replyto, all ?
                util.format('Found %d feeds in total.', feedlist.length) :
                util.format('Found %d feeds for %s/%s.', feedlist.length, cmd.network, cmd.replyto));

            feedlist.forEach(function (feed) {
                bot.say(cmd.network, cmd.replyto, util.format('  %s %s %s %s', feed.network, feed.target, feed.name, feed.url));
            });

            break;

        case 'fetch':
            feeds.forEach(function (feed) {
                if (cmd.network == feed.network && cmd.replyto == feed.target && (!cmd.args[1] || cmd.args[1] == 'all' || cmd.args[1] == feed.name))
                    fetch(feed);
            });

            break;

        case 'start':
            var interval = defaultInterval;
            try {
                interval = parseInt(bot.config.plugins.rss.interval);
            } catch (e) {}


            if (!intervalObj) {
                bot.say(cmd.network, cmd.replyto, util.format('Starting to fetch feeds every %d minutes.', interval));
                intervalObj = setInterval(fetchAll, interval * 60000);
            }
            else {
                bot.say(cmd.network, cmd.replyto, util.format('Feeds are already being fetched every %d seconds.', interval));
            }

            break;

        case 'stop':
            if (intervalObj) {
                bot.say(cmd.network, cmd.replyto, 'Stopping fetching feeds.');
                clearInterval(intervalObj);
                intervalObj = null;
            }

            break;

        default:
            break;
        }
    });
};
