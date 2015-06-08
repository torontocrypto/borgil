var FeedParser = require('feedparser');
var handlebars = require('handlebars');
var irc = require('irc');
var DataStore = require('nedb');
var path = require('path');
var request = require('request');
var util = require('util');


var defaultInterval = 10;
var interval = defaultInterval;
var intervalObj = null;


module.exports = function (bot) {
    var db = new DataStore({
        filename: path.join(this.config.dbdir, 'rss.db'),
        autoload: true,
    });

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
    var render_list_template = handlebars.compile(list_template ||
        ' {{network}} {{target}} {{color}}{{name}}{{reset}} {{url}}');


    // fetch a feed and reply with the latest entry
    function fetch(feed, ignoreCache) {
        bot.log('Fetching feed "%s" from %s', feed.name, feed.url);

        var parser = new FeedParser({});

        // add cache validation headers
        var headers = {};
        if (!ignoreCache) {
            if (feed.etag) {
                bot.log('Sending saved etag %s for feed "%s"', feed.etag, feed.name);
                headers['If-None-Match'] = feed.etag;
            }
            if (feed.last_modified) {
                bot.log('Sending saved last-modified date "%s" for feed "%s"', feed.last_modified, feed.name);
                headers['If-Modified-Since'] = feed.last_modified;
            }
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
            var update = {};
            if (res.headers.etag) {
                bot.log('Saving etag %s for feed "%s"', res.headers.etag, feed.name);
                update.etag = res.headers.etag;
            }
            if (res.headers['last-modified']) {
                bot.log('Saving last-modified date "%s" for feed "%s"', res.headers['last-modified'], feed.name);
                update.last_modified = res.headers['last-modified'];
            }
            db.update({
                network: feed.network,
                target: feed.target,
                name: feed.name,
            }, {
                $set: update,
            }, {}, function (err, count) {
                if (count) bot.log('Successfully saved cache headers for feed %s', feed.name);
            });

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
            };

            // add colors to template data
            for (color in irc.colors.codes) {
                data[color] = irc.colors.codes[color];
            }

            bot.say(feed.network, feed.target, render_item_template(data));
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
                bot.say(cmd.network, cmd.replyto, 'Usage: .rss add <feed name> <feed url> [<color>]');
                break;
            }

            db.find({
                network: cmd.network,
                target: cmd.replyto,
                $or: [
                    {name: name},
                    {url: url},
                ],
            }, function (err, feeds) {
                // check against existing feeds for this target
                if (feeds.length) {
                    bot.say(cmd.network, cmd.replyto,
                        'A feed already exists with that %s.', feeds[0].name == name ? 'name' : 'URL');
                }
                else {
                    // add the feed to the list for this target
                    db.insert({
                        name: name,
                        url: url,
                        network: cmd.network,
                        target: cmd.replyto,
                        color: irc.colors.codes[color] || '',
                    });
                    bot.say(cmd.network, cmd.replyto, 'Added 1 feed.');
                }
            });

            break;


        case 'del':
        case 'delete':
        case 'remove':
        case 'rm':
            db.remove({
                network: cmd.network,
                target: cmd.replyto,
                $or: [
                    {name: name},
                    {url: url},
                ],
            }, function (err, count) {
                if (count) bot.say(cmd.network, cmd.replyto, 'Removed %d feed%s.', removed, removed > 1 ? 's' : '');
            });

            break;


        case 'list':
            // TODO: make the 'all' option admin-only
            var all = cmd.args[1] == 'all';

            db.find(all ? {} : {
                network: cmd.network,
                target: cmd.replyto,
            }, function (err, feeds) {
                bot.say(cmd.network, cmd.replyto, all ?
                    util.format('Found %d feeds in total.', feeds.length) :
                    util.format('Found %d feeds for %s/%s.', feeds.length, cmd.network, cmd.replyto));

                feeds.forEach(function (feed) {
                    // add colors to feed info for use as template data
                    for (color in irc.colors.codes) {
                        feed[color] = irc.colors.codes[color];
                    }

                    bot.say(cmd.network, cmd.replyto, render_list_template(feed));
                });
            });

            break;


        case 'fetch':
            var filter = {
                network: cmd.network,
                target: cmd.replyto,
            };

            if (cmd.args[1] && cmd.args[1] != 'all') {
                filter.name = cmd.args[1];
            }

            db.find(filter, function (err, feeds) {
                feeds.forEach(function (feed) {
                    fetch(feed, true);
                });
            });

            break;


        case 'start':
            var newInterval = parseInt(cmd.args[1]);

            try {
                interval = newInterval || parseInt(bot.config.plugins.rss.interval) || interval;
            } catch (e) {}

            if (!intervalObj || newInterval) {
                bot.say(cmd.network, cmd.replyto, util.format('Starting to fetch feeds every %d minutes.', interval));
                intervalObj = setInterval(function () {
                    bot.log('Fetching RSS feeds...');
                    db.find({}, function (err, feeds) {
                        feeds.forEach(function (feed) {
                            fetch(feed);
                        });
                    });
                }, interval * 60000);
            }
            else {
                bot.say(cmd.network, cmd.replyto, util.format('Feeds are already being fetched every %d minutes.', interval));
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
