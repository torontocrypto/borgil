var Entities = require('html-entities').AllHtmlEntities;
var extend = require('extend');
var FeedParser = require('feedparser');
var handlebars = require('handlebars');
var irc = require('irc');
var DataStore = require('nedb');
var path = require('path');
var request = require('request');


var defaults = {
    interval: 10,
    item_template: '[{{color}}{{name}}{{reset}}] {{{title}}} | {{url}}',
    list_template: ' {{transport}} {{target}} {{color}}{{name}}{{reset}} {{url}}'
};

var interval;
var intervalObj;

var entities = new Entities();

module.exports = function () {
    this.db = new DataStore({
        filename: path.join(this.config.get('dbdir', ''), 'rss.db'),
        autoload: true,
    });

    var plugin = this;

    // fetch a feed and reply with the latest entry
    this.fetchLatestItem = function (feed, callback) {
        plugin.log('[%s] Fetching feed at', feed.name, feed.url);

        // Build cache validation headers.
        var headers = {};
        if (feed.etag) {
            plugin.log('[%s] Sending saved etag:', feed.name || '', feed.etag);
            headers['If-None-Match'] = feed.etag;
        }
        if (feed.last_modified) {
            plugin.log('[%s] Sending saved last-modified date:',
                feed.name || '', feed.last_modified);
            headers['If-Modified-Since'] = feed.last_modified;
        }

        var parser = new FeedParser({});

        request.get({
            url: feed.url,
            headers: headers
        })
        .on('error', function (e) {
            plugin.error('RSS request error:', e.message);
        })
        .on('response', function (res) {
            plugin.log('[%s] Received %d response', feed.name, res.statusCode);

            if (res.statusCode == 304) return;
            if (res.statusCode != 200) return plugin.error('Bad status code %d from RSS feed', res.statusCode, feed.name);

            if (feed.name) {
                // Save cache validation headers.
                var update = null;
                if (res.headers.etag) {
                    plugin.log('[%s] Got etag:', feed.name, res.headers.etag);
                    update = extend(update || {}, {etag: res.headers.etag});
                }
                if (res.headers['last-modified']) {
                    plugin.log('[%s] Got last-modified date:', feed.name, res.headers['last-modified']);
                    update = extend(update || {}, {last_modified: res.headers['last-modified']});
                }
                if (update !== null) {
                    plugin.db.update({
                        transport: feed.transport,
                        target: feed.target,
                        name: feed.name,
                    }, {
                        $set: update,
                    }, {}, function (err, count) {
                        if (count) plugin.log('[%s] Updated cache headers.', feed.name);
                    });
                }
            }

            this.pipe(parser);
        });

        parser
        .on('error', function (err) {
            plugin.error('RSS parser error:', err.message);
            callback(err, null);
        })
        .once('readable', function () {
            var item = this.read();

            plugin.log('[%s] Got latest item from feed.', feed.name || '');
            callback(null, {
                title: entities.decode(item.title),
                url: item.link,
            });
        });
    };

    this.displayItem = function (feed, item) {
        var render_item_template = handlebars.compile(
            plugin.config.get('plugins.rss.item_template', defaults.item_template));

        var data = extend({
            name: feed.name,
            color: irc.colors.codes[feed.color] || feed.color,
        }, item, irc.colors.codes);

        plugin.log('[%s] Displaying link:', feed.name, item.link);
        plugin.transports[feed.transport].say(feed.target, render_item_template(data));
    };

    this.updateFeed = function (feed, item) {
        // Save latest item to database.
        plugin.db.update({
            transport: feed.transport,
            target: feed.target,
            name: feed.name,
        }, {
            $set: {
                latest: item,
            }
        }, {}, function (err, count) {
            if (count) plugin.log('[%s] Saved latest item.', feed.name);
        });
    };

    this.itemsEqual = function (item1, item2) {
        return item1 && item2 && (item1.title === item2.title) && (item1.url === item2.url);
    };

    function findFeeds(cmd, callback) {
        var args = cmd.args.match(/^\S+(?:\s+("[^"]+"|[\w-]+))?/);

        // fetch feeds from all channels (admin only)
        var all = args[1] == 'all' && plugin.config.get('admins', []).indexOf(cmd.nick) > -1;

        var filter = {
            transport: cmd.transport.name,
            target: cmd.replyto,
        };
        if (args[1] && args[1] != 'all') filter.name = args[1].replace(/^"|"$/g, '');

        plugin.db.find(all ? {} : filter, callback);
    }

    function startFetching(newInterval) {
        // if new interval was passed, clear the old one
        if (newInterval) {
            clearInterval(intervalObj);
            intervalObj = null;
        }

        interval = newInterval || parseInt(plugin.config.get('plugins.rss.interval')) || interval || defaults.interval;

        if (!intervalObj) {
            intervalObj = setInterval(function () {
                plugin.log('Fetching RSS feeds...');
                plugin.db.find({}, function (err, feeds) {
                    feeds.forEach(function (feed) {
                        plugin.fetchLatestItem(feed, function (err, item) {
                            if (feed.latest && plugin.itemsEqual(feed.latest, item)) {
                                return plugin.log('[%s] Latest item is the same as last fetch; skipping.', feed.name || '');
                            }
                            plugin.displayItem(feed, item);
                            plugin.updateFeed(feed, item);
                        });
                    });
                });
            }, interval * 60000);

            plugin.log('Starting to fetch feeds every %d minutes.', interval);
            return true;
        }
    }

    this.addCommand('rss', function (cmd) {
        var m = cmd.args.match(/^(\w+)(?:\s+(.*))?$/);
        var action = m && m[1];
        var args = m && m[2];

        switch (action) {

        case 'add':
            // Feed names can contain spaces as long as they are wrapped in double quotes.
            var addArgs = args && args.match(/^("[^"]+"|[\w-]+)\s+(https?:\/\/\S+\.\S+)(?:\s+(\w+))?/);

            if (!addArgs) {
                cmd.transport.say(cmd.replyto, 'Usage: .rss add <feed name> <feed url> [<color>]');
                break;
            }

            var name = addArgs[1],
                url = addArgs[2],
                color = addArgs[3] || '';

            if (name == 'all') {
                cmd.transport.say(cmd.replyto, 'Invalid feed name.');
                break;
            }
            name = name.replace(/^"|"$/g, '');

            plugin.db.find({
                transport: cmd.transport.name,
                target: cmd.replyto,
                $or: [
                    {name: name},
                    {url: url},
                ],
            }, function (err, feeds) {
                if (err) return plugin.error('Error checking for feed:', err.message);

                // check against existing feeds for this target
                if (feeds.length) {
                    cmd.transport.say(cmd.replyto,
                        'A feed already exists with that %s.', feeds[0].name == name ? 'name' : 'URL');
                }
                else {
                    // add the feed to the list for this target
                    plugin.db.insert({
                        transport: cmd.transport.name,
                        target: cmd.replyto,
                        name: name,
                        url: url,
                        color: color,
                    }, function (err, feed) {
                        if (err) return plugin.error('Error saving feed:', err.message);
                        if (feed) cmd.transport.say(cmd.replyto, 'Added 1 feed.');
                    });
                }
            });

            break;


        case 'del':
        case 'delete':
        case 'remove':
        case 'rm':
            var delArgs = args && args.match(/^("[^"]+"|[\w-]+)?/);

            if (delArgs && delArgs[1]) {
                plugin.db.remove({
                    transport: cmd.transport.name,
                    target: cmd.replyto,
                    name: delArgs[1].replace(/^"|"$/g, ''),
                }, function (err, count) {
                    if (count) cmd.transport.say(cmd.replyto, 'Removed 1 feed.');
                    else cmd.transport.say(cmd.replyto, 'No matching feed found.');
                });
            }

            break;


        case 'list':
            findFeeds(cmd, function (err, feeds) {
                cmd.transport.say(cmd.replyto, 'Found %d feed%s.', feeds.length,
                    feeds.length == 1 ? '' : 's');

                var render_list_template = handlebars.compile(plugin.config.get('plugins.rss.list_template', defaults.list_template));

                feeds.forEach(function (feed) {
                    // add colors to feed info for use as template data
                    feed.color = irc.colors.codes[feed.color] || '';
                    for (color in irc.colors.codes) {
                        feed[color] = irc.colors.codes[color];
                    }

                    cmd.transport.say(cmd.replyto, render_list_template(feed));
                });
            });

            break;


        case 'quick':
            var feed = {
                name: 'QUICK',
                transport: cmd.transport.name,
                target: cmd.replyto,
                url: args,
            };

            plugin.fetchLatestItem(feed, function (err, item) {
                plugin.displayItem(feed, item);
            });

            break;


        case 'fetch':
        case 'latest':
            // Manually fetch feeds and display latest item.
            // 'latest' will always display; 'fetch' will only display if new.
            findFeeds(cmd, function (err, feeds) {
                feeds.forEach(function (feed) {
                    plugin.fetchLatestItem(feed, function (err, item) {
                        if (action === 'fetch' && feed.latest && plugin.itemsEqual(feed.latest, item)) {
                            return plugin.log('[%s] Latest item is the same as last fetch; skipping.', feed.name || '');
                        }
                        plugin.displayItem(feed, item);
                        plugin.updateFeed(feed, item);
                    });
                });
            });

            break;


        case 'start':
            var started = startFetching(parseInt(args && args[1]));
            cmd.transport.say(cmd.replyto,
                (started ? 'Starting to fetch feeds every %d minutes.' : 'Feeds are already being fetched every %d minutes.'),
                interval);

            break;


        case 'stop':
            if (intervalObj) {
                cmd.transport.say(cmd.replyto, 'Stopped fetching feeds.');
                clearInterval(intervalObj);
                intervalObj = null;
            }

            break;


        case 'colors':
        case 'colours':
            cmd.transport.say(cmd.replyto, 'Available colors:', Object.keys(irc.colors.codes).join(', '));

            break;


        default:
            break;
        }
    });

    // start fetching feeds right away if configured
    if (this.config.get('plugins.rss.autostart')) {
        this.log('Starting RSS feeds automatically.');
        startFetching();
    }
};
