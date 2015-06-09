var FeedParser = require('feedparser');
var handlebars = require('handlebars');
var irc = require('irc');
var DataStore = require('nedb');
var path = require('path');
var request = require('request');


var defaults = {
    interval: 10,
    item_template: '[{{color}}{{name}}{{reset}}] {{title}} | {{url}}',
    list_template: ' {{network}} {{target}} {{color}}{{name}}{{reset}} {{url}}'
};

var interval;
var intervalObj;


module.exports = function (bot) {
    var db = new DataStore({
        filename: path.join(bot.config.get('dbdir'), 'rss.db'),
        autoload: true,
    });

    // fetch a feed and reply with the latest entry
    function fetch(feed, ignoreCache) {
        bot.log('Fetching feed "%s" from %s', feed.name, feed.url);

        // build cache validation headers
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

        var parser = new FeedParser({});
        var render_item_template = handlebars.compile(bot.config.get('plugins.rss.item_template') || defaults.item_template);

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


    function findFeeds(cmd, callback) {
        var args = cmd.text.match(/^\S+(?:\s+("[^"]+"|[\w-]+))?/);

        // fetch feeds from all channels (admin only)
        var all = args[1] == 'all' && (bot.config.get('admins') || []).indexOf(cmd.nick) > -1;

        var filter = {
            network: cmd.network,
            target: cmd.replyto,
        };
        if (args[1] && args[1] != 'all') filter.name = args[1].replace(/^"|"$/g, '');

        db.find(all ? {} : filter, callback);
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
            var args = cmd.text.match(/^\S+\s+("[^"]+"|[\w-]+)\s+(https?:\/\/\S+\.\S+)(?:\s+(\w+))?/);

            if (!args) {
                bot.say(cmd.network, cmd.replyto, 'Usage: .rss add <feed name> <feed url> [<color>]');
                break;
            }

            var name = args[1],
                url = args[2],
                color = args[3] || '';

            if (name == 'all') {
                bot.say(cmd.network, cmd.replyto, 'Invalid feed name.');
                break;
            }
            name = name.replace(/^"|"$/g, '');

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
            var args = cmd.text.match(/^\S+\s+("[^"]+"|[\w-]+)?/);

            if (args[1]) {
                db.remove({
                    network: cmd.network,
                    target: cmd.replyto,
                    name: args[1].replace(/^"|"$/g, ''),
                }, function (err, count) {
                    if (count) bot.say(cmd.network, cmd.replyto, 'Removed 1 feed.');
                });
            }

            break;


        case 'list':
            findFeeds(cmd, function (err, feeds) {
                bot.say(cmd.network, cmd.replyto, 'Found %d feed%s.', feeds.length, feeds.length == 1 ? '' : 's');

                var render_list_template = handlebars.compile(bot.config.get('plugins.rss.list_template') || defaults.list_template);

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
            findFeeds(cmd, function (err, feeds) {
                feeds.forEach(function (feed) {
                    fetch(feed, true);
                });
            });

            break;


        case 'start':
            var newInterval = parseInt(cmd.args[1]);
            interval = newInterval || parseInt(bot.config.get('plugins.rss.interval')) || interval || defaults.interval;

            if (!intervalObj || newInterval) {
                bot.say(cmd.network, cmd.replyto, 'Starting to fetch feeds every %d minutes.', interval);
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
                bot.say(cmd.network, cmd.replyto, 'Feeds are already being fetched every %d minutes.', interval);
            }

            break;


        case 'stop':
            if (intervalObj) {
                bot.say(cmd.network, cmd.replyto, 'Stopping fetching feeds.');
                clearInterval(intervalObj);
                intervalObj = null;
            }

            break;


        case 'colors':
        case 'colours':
            bot.say(cmd.network, cmd.replyto, 'Available colors:', Object.keys(irc.colors.codes).join(', '));

            break;


        default:
            break;
        }
    });
};
