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
    list_template: ' {{network}} {{target}} {{color}}{{name}}{{reset}} {{url}}'
};

var interval;
var intervalObj;

var entities = new Entities();

module.exports = function () {
    var db = this.memory.rssdb = new DataStore({
        filename: path.join(this.config.get('dbdir', ''), 'rss.db'),
        autoload: true,
    });

    var plugin = this;

    // fetch a feed and reply with the latest entry
    function fetch(feed, ignoreCache) {
        plugin.log('[%s] Fetching feed at', feed.name, feed.url);

        // build cache validation headers
        var headers = {};
        if (!ignoreCache && feed.name) {
            if (feed.etag) {
                plugin.log('[%s] Sending saved etag:', feed.name, feed.etag);
                headers['If-None-Match'] = feed.etag;
            }
            if (feed.last_modified) {
                plugin.log('[%s] Sending saved last-modified date:', feed.name, feed.last_modified);
                headers['If-Modified-Since'] = feed.last_modified;
            }
        }

        var parser = new FeedParser({});
        var render_item_template = handlebars.compile(plugin.config.get('plugins.rss.item_template', defaults.item_template));

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
                // save cache validation headers
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
                    db.update({
                        network: feed.network,
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
        .on('error', function (e) {
            plugin.error('RSS parser error:', e.message);
        })
        .once('readable', function () {
            item = this.read();

            if (feed.name) {
                // a set of properties to compare with the last item
                var latest = {
                    title: entities.decode(item.title),
                    url: item.link,
                };

                // compare and skip if unchanged
                if (!ignoreCache && feed.latest && Object.keys(latest).every(function (key) {
                    return latest[key] == feed.latest[key];
                })) {
                    plugin.log('[%s] Latest item is the same as last fetch; skipping.', feed.name);
                    return;
                }

                // save latest item
                db.update({
                    network: feed.network,
                    target: feed.target,
                    name: feed.name,
                }, {
                    $set: {
                        latest: latest,
                    }
                }, {}, function (err, count) {
                    if (count) plugin.log('[%s] Saved latest item.', feed.name)
                });
            }

            // template data, including color codes
            var data = extend({
                title: entities.decode(item.title),
                url: item.link,
                name: feed.name,
                color: feed.color,
            },
            irc.colors.codes);

            plugin.log('[%s] Displaying link:', feed.name, item.link);
            plugin.say(feed.network, feed.target, render_item_template(data));
        });
    }

    function findFeeds(cmd, callback) {
        var args = cmd.text.match(/^\S+(?:\s+("[^"]+"|[\w-]+))?/);

        // fetch feeds from all channels (admin only)
        var all = args[1] == 'all' && plugin.config.get('admins', []).indexOf(cmd.nick) > -1;

        var filter = {
            network: cmd.network,
            target: cmd.replyto,
        };
        if (args[1] && args[1] != 'all') filter.name = args[1].replace(/^"|"$/g, '');

        db.find(all ? {} : filter, callback);
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
                db.find({}, function (err, feeds) {
                    feeds.forEach(function (feed) {
                        fetch(feed);
                    });
                });
            }, interval * 60000);

            plugin.log('Starting to fetch feeds every %d minutes.', interval);
            return true;
        }
    }

    this.addCommand('rss', function (cmd) {
        var args = cmd.args.split(/\s+/);

        switch(args[0]) {

        case 'quick':
            fetch({
                name: '',
                url: args[1],
                network: cmd.network,
                target: cmd.replyto,
            });

            break;


        case 'add':
            // Feed names can contain spaces as long as they are wrapped in double quotes.
            var addArgs = cmd.args.match(/^add\s+("[^"]+"|[\w-]+)\s+(https?:\/\/\S+\.\S+)(?:\s+(\w+))?/);

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

            db.find({
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
                    db.insert({
                        transport: cmd.transport.name,
                        target: cmd.replyto,
                        name: name,
                        url: url,
                        color: irc.colors.codes[color] || '',
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
            var delArgs = cmd.args.match(/^("[^"]+"|[\w-]+)?/);

            if (delArgs[1]) {
                db.remove({
                    network: cmd.network,
                    target: cmd.replyto,
                    name: delArgs[1].replace(/^"|"$/g, ''),
                }, function (err, count) {
                    if (count) plugin.say(cmd.network, cmd.replyto, 'Removed 1 feed.');
                });
            }

            break;


        case 'list':
            findFeeds(cmd, function (err, feeds) {
                plugin.say(cmd.network, cmd.replyto, 'Found %d feed%s.', feeds.length, feeds.length == 1 ? '' : 's');

                var render_list_template = handlebars.compile(plugin.config.get('plugins.rss.list_template', defaults.list_template));

                feeds.forEach(function (feed) {
                    // add colors to feed info for use as template data
                    for (color in irc.colors.codes) {
                        feed[color] = irc.colors.codes[color];
                    }

                    plugin.say(cmd.network, cmd.replyto, render_list_template(feed));
                });
            });

            break;


        case 'fetch':
            // manually fetch feeds and display new items
            findFeeds(cmd, function (err, feeds) {
                feeds.forEach(function (feed) {
                    fetch(feed);
                });
            });

            break;


        case 'latest':
            // manually fetch feeds and display latest items, even if already cached
            findFeeds(cmd, function (err, feeds) {
                feeds.forEach(function (feed) {
                    fetch(feed, true);
                });
            });

            break;


        case 'start':
            var started = startFetching(parseInt(args[1]));
            plugin.say(cmd.network, cmd.replyto,
                (started ? 'Starting to fetch feeds every %d minutes.' : 'Feeds are already being fetched every %d minutes.'),
                interval);

            break;


        case 'stop':
            if (intervalObj) {
                plugin.say(cmd.network, cmd.replyto, 'Stopped fetching feeds.');
                clearInterval(intervalObj);
                intervalObj = null;
            }

            break;


        case 'colors':
        case 'colours':
            plugin.say(cmd.network, cmd.replyto, 'Available colors:', Object.keys(irc.colors.codes).join(', '));

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
