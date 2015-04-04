var FeedParser = require('feedparser');
var request = require('request');
var util = require('util');


var feeds = [];

var interval = 120;

var intervalObj = null;


module.exports = function (bot) {
    function fetch(feed) {
        var parser = new FeedParser({});

        request.get(feed.url)
        .on('error', function (err) {
            bot.log('RSS request error: ' + err);
        })
        .on('response', function (res) {
            if (res.statusCode != 200) return this.emit('error', new Error('Bad RSS status code: ' + res.statusCode));
            this.pipe(parser);
        });

        parser
        .on('error', function (err) {
            bot.log('RSS parser error: ' + err);
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

        case 'remove':
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
            if (!intervalObj) {
                bot.say(cmd.network, cmd.replyto, util.format('Starting to fetch feeds every %d seconds.', interval));
                intervalObj = setInterval(fetchAll, interval * 1000);
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
