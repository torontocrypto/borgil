var FeedParser = require('feedparser');
var handlebars = require('handlebars');
var irc = require('irc');
var request = require('request');
var util = require('util');


var feeds = [];

var defaultInterval = 10;
var intervalObj = null;


module.exports = function (bot) {
    // get mustache templates from config
    var item_template;
    try {
        item_template = bot.config.plugins.rss.item_template;
    } catch (e) {}
    var render_item_template = handlebars.compile(item_template || '{{title}} | {{url}}');

    var list_template;
    try {
        list_template = bot.config.plugins.list_template;
    } catch (e) {}
    var render_list_template = handlebars.compile(list_template || ' {{network}} {{target}} {{color}}{{name}}{{reset}} {{url}}');


    // fetch a feed and reply with the latest entry
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

            // template data
            var data = {
                title: item.title,
                url: item.link,
                name: feed.name,
                color: feed.color,
                colour: feed.color,
            };

            // add colors to template data
            for (color in irc.colors.codes) {
                data[color] = irc.colors.codes[color];
            }

            bot.say(feed.network, feed.target, render_item_template(data));
        });
    }


    // fetch all saved feeds
    function fetchAll() {
        bot.log('Fetching RSS feeds...');
        feeds.forEach(function (feed) {
            fetch(feed);
        });
    }


    bot.addCommand('rss', function (cmd) {
        switch(cmd.args[0]) {

        case 'latest':
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
                url = cmd.args[2],
                color = cmd.args[3] || '';

            if (!name || !url.match(/^https?:\/\/.+\..+/)) {
                bot.say(cmd.network, cmd.replyto, 'Usage: .rss add <feed name> <feed url> [<colour>]');
                break;
            }

            // check against existing feeds for this target
            if (feeds.some(function (feed) {
                if (feed.network == cmd.network && feed.target == cmd.replyto) {
                    if (feed.name == name) {
                        bot.say(cmd.network, cmd.replyto, 'A feed already exists with that name.');
                        return true;
                    }
                    else if (feed.url == url) {
                        bot.say(cmd.network, cmd.replyto, 'A feed already exists with that URL.');
                        return true;
                    }
                }
            })) break;

            // add the feed to the list for this target
            feeds.push({
                name: name,
                url: url,
                network: cmd.network,
                target: cmd.replyto,
                color: irc.colors.codes[color] || '',
                colour: irc.colors.codes[color] || '',
            });
            bot.say(cmd.network, cmd.replyto, 'Added 1 feed.');

            break;


        case 'del':
        case 'delete':
        case 'remove':
        case 'rm':
            var count = feeds.length;
            feeds = feeds.filter(function (feed) {
                return (cmd.args[1] != feed.name && cmd.args[1] != feed.url);
            });

            var removed = count - feeds.length;
            if (removed) bot.say(cmd.network, cmd.replyto, 'Removed %d feed%s.', removed, removed > 1 ? 's' : '');

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
                // add colors to feed info for use as template data
                for (color in irc.colors.codes) {
                    feed[color] = irc.colors.codes[color];
                }

                bot.say(cmd.network, cmd.replyto, render_list_template(feed));
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
