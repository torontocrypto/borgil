'use strict';

const Entities = require('html-entities').AllHtmlEntities;
const extend = require('extend');
const FeedParser = require('feedparser');
const handlebars = require('handlebars');
const irc = require('irc');
const DataStore = require('nedb');
const path = require('path');
const request = require('request');


const defaults = {
    interval: 10,
    item_template: '[{{color}}{{name}}{{reset}}] {{{title}}} | {{url}}',
    list_template: ' {{transport}} {{target}} {{color}}{{name}}{{reset}} {{url}}',
};

let interval;
let intervalObj;

const entities = new Entities();

module.exports = function rssPlugin(plugin) {
    plugin.db = new DataStore({
        filename: path.join(plugin.config.get('dbdir', ''), 'rss.db'),
        autoload: true,
    });

    // fetch a feed and reply with the latest entry
    plugin.fetchLatestItem = (feed, callback) => {
        plugin.log('[%s] Fetching feed at', feed.name, feed.url);

        // Build cache validation headers.
        const headers = {};
        if (feed.etag) {
            plugin.log('[%s] Sending saved etag:', feed.name || '', feed.etag);
            headers['If-None-Match'] = feed.etag;
        }
        if (feed.last_modified) {
            plugin.log('[%s] Sending saved last-modified date:',
                feed.name || '', feed.last_modified);
            headers['If-Modified-Since'] = feed.last_modified;
        }

        const parser = new FeedParser({});

        request.get(
            {
                url: feed.url,
                headers,
            })
            .on('error', (err) => {
                plugin.error('RSS request error:', err.message);
            })
            .on('response', (res) => {
                plugin.log('[%s] Received %d response', feed.name, res.statusCode);

                if (res.statusCode === 304) {
                    return;
                }
                if (res.statusCode !== 200) {
                    return plugin.error('Bad status code %d from RSS feed',
                        res.statusCode, feed.name);
                }

                if (feed.name) {
                    // Save cache validation headers.
                    let update;
                    if (res.headers.etag) {
                        plugin.log('[%s] Got etag:', feed.name, res.headers.etag);
                        update = extend(update || {}, {etag: res.headers.etag});
                    }
                    if (res.headers['last-modified']) {
                        plugin.log('[%s] Got last-modified date:',
                            feed.name, res.headers['last-modified']);
                        update = extend(update || {},
                            {last_modified: res.headers['last-modified']});
                    }
                    if (update) {
                        plugin.db.update(
                            {
                                transport: feed.transport,
                                target: feed.target,
                                name: feed.name,
                            },
                            {$set: update},
                            {},
                            (err, count) => {
                                if (count) {
                                    plugin.log('[%s] Updated cache headers.', feed.name);
                                }
                            });
                    }
                }

                res.pipe(parser);
            });

        parser
            .on('error', (err) => {
                plugin.error('RSS parser error:', err.message);
                callback(err, null);
            })
            .once('readable', () => {
                const item = parser.read();

                plugin.log('[%s] Got latest item from feed.', feed.name || '');
                callback(null, {
                    title: entities.decode(item.title),
                    url: item.link,
                });
            });
    }

    function displayItem(feed, item) {
        const renderItemTemplate = handlebars.compile(
            plugin.config.get('plugins.rss.item_template', defaults.item_template));

        const data = extend({
            name: feed.name,
            color: irc.colors.codes[feed.color] || feed.color,
        }, item, irc.colors.codes);

        plugin.log('[%s] Displaying link:', feed.name, item.link);
        plugin.transports[feed.transport].say(feed.target, renderItemTemplate(data));
    }

    function updateFeed(feed, item) {
        // Save latest item to database.
        plugin.db.update(
            {
                transport: feed.transport,
                target: feed.target,
                name: feed.name,
            },
            {$set: {latest: item}},
            {},
            (err, count) => {
                if (count) {
                    plugin.log('[%s] Saved latest item.', feed.name);
                }
            });
    }

    function itemsEqual(item1, item2) {
        return item1 && item2 && (item1.title === item2.title) && (item1.url === item2.url);
    }

    function findFeeds(cmd, callback) {
        const args = cmd.args.match(/^\S+(?:\s+("[^"]+"|[\w-]+))?/);

        // fetch feeds from all channels (admin only)
        const all = args[1] === 'all' && plugin.config.get('admins', []).indexOf(cmd.nick) > -1;

        const filter = {
            transport: cmd.transport.name,
            target: cmd.replyto,
        };
        if (args[1] && args[1] !== 'all') {
            filter.name = args[1].replace(/^"|"$/g, '');
        }

        plugin.db.find(all ? {} : filter, callback);
    }

    function startFetching(newInterval) {
        // if new interval was passed, clear the old one
        if (newInterval) {
            clearInterval(intervalObj);
            intervalObj = null;
        }

        interval = newInterval || parseInt(plugin.config.get('plugins.rss.interval')) ||
            interval || defaults.interval;

        if (!intervalObj) {
            intervalObj = setInterval(() => {
                plugin.log('Fetching RSS feeds...');
                plugin.db.find({}, (err, feeds) => {
                    feeds.forEach((feed) => {
                        plugin.fetchLatestItem(feed, (err, item) => {
                            if (feed.latest && itemsEqual(feed.latest, item)) {
                                return plugin.log(`[${feed.name || ''}]`,
                                    'Latest item is the same as last fetch; skipping.');
                            }
                            displayItem(feed, item);
                            updateFeed(feed, item);
                        });
                    });
                });
            }, interval * 60000);

            plugin.log('Starting to fetch feeds every %d minutes.', interval);
            return true;
        }
    }

    plugin.addCommand('rss', (cmd) => {
        const m = cmd.args.match(/^(\w+)(?:\s+(.*))?$/);
        const action = m && m[1];
        const args = m && m[2];

        switch (action) {
        case 'add': {
            // Feed names can contain spaces as long as they are wrapped in double quotes.
            const addArgs = args &&
                args.match(/^("[^"]+"|[\w-]+)\s+(https?:\/\/\S+\.\S+)(?:\s+(\w+))?/);

            if (!addArgs) {
                cmd.transport.say(cmd.replyto, 'Usage: .rss add <feed name> <feed url> [<color>]');
                break;
            }

            const rawName = addArgs[1];
            const url = addArgs[2];
            const color = addArgs[3] || '';

            if (rawName === 'all') {
                cmd.transport.say(cmd.replyto, 'Invalid feed name.');
                break;
            }
            const name = rawName.replace(/^"|"$/g, '');

            plugin.db.find(
                {
                    transport: cmd.transport.name,
                    target: cmd.replyto,
                    $or: [
                        {name},
                        {url},
                    ],
                },
                (err, feeds) => {
                    if (err) {
                        return plugin.error('Error checking for feed:', err.message);
                    }

                    // check against existing feeds for this target
                    if (feeds.length) {
                        cmd.transport.say(cmd.replyto, 'A feed already exists with that %s.',
                            feeds[0].name === name ? 'name' : 'URL');
                    }
                    else {
                        // add the feed to the list for this target
                        plugin.db.insert(
                            {
                                transport: cmd.transport.name,
                                target: cmd.replyto,
                                name,
                                url,
                                color,
                            },
                            (err, feed) => {
                                if (err) {
                                    return plugin.error('Error saving feed:', err.message);
                                }
                                if (feed) {
                                    cmd.transport.say(cmd.replyto, 'Added 1 feed.');
                                }
                            });
                    }
                });

            break;
        }

        case 'del':
        case 'delete':
        case 'remove':
        case 'rm': {
            const delArgs = args && args.match(/^("[^"]+"|[\w-]+)?/);

            if (delArgs && delArgs[1]) {
                plugin.db.remove(
                    {
                        transport: cmd.transport.name,
                        target: cmd.replyto,
                        name: delArgs[1].replace(/^"|"$/g, ''),
                    },
                    (err, count) => {
                        if (count) {
                            cmd.transport.say(cmd.replyto, 'Removed 1 feed.');
                        }
                        else {
                            cmd.transport.say(cmd.replyto, 'No matching feed found.');
                        }
                    });
            }

            break;
        }

        case 'list':
            findFeeds(cmd, (err, feeds) => {
                cmd.transport.say(cmd.replyto, 'Found %d feed%s.', feeds.length,
                    feeds.length === 1 ? '' : 's');

                const renderListTemplate = handlebars.compile(
                    plugin.config.get('plugins.rss.list_template', defaults.list_template));

                feeds.forEach((feed) => {
                    // add colors to feed info for use as template data
                    const colorFeed = Object.assign({}, feed,
                        {color: irc.colors.codes[feed.color] || ''});
                    Object.keys(irc.colors.codes).forEach((color) => {
                        colorFeed[color] = irc.colors.codes[color];
                    });

                    cmd.transport.say(cmd.replyto, renderListTemplate(colorFeed));
                });
            });

            break;

        case 'quick': {
            const feed = {
                name: 'QUICK',
                transport: cmd.transport.name,
                target: cmd.replyto,
                url: args,
            };

            plugin.fetchLatestItem(feed, (err, item) => displayItem(feed, item));

            break;
        }

        case 'fetch':
        case 'latest':
            // Manually fetch feeds and display latest item.
            // 'latest' will always display; 'fetch' will only display if new.
            findFeeds(cmd, (err, feeds) => {
                feeds.forEach((feed) => {
                    plugin.fetchLatestItem(feed, (err, item) => {
                        if (action === 'fetch' && feed.latest && itemsEqual(feed.latest, item)) {
                            return plugin.log(`[${feed.name || ''}]`,
                                'Latest item is the same as last fetch; skipping.');
                        }
                        displayItem(feed, item);
                        updateFeed(feed, item);
                    });
                });
            });

            break;

        case 'start': {
            const started = startFetching(parseInt(args && args[1]));
            cmd.transport.say(cmd.replyto,
                (started ? 'Starting to fetch feeds every %d minutes.' :
                    'Feeds are already being fetched every %d minutes.'),
                interval);

            break;
        }

        case 'stop':
            if (intervalObj) {
                cmd.transport.say(cmd.replyto, 'Stopped fetching feeds.');
                clearInterval(intervalObj);
                intervalObj = null;
            }

            break;

        case 'colors':
        case 'colours':
            cmd.transport.say(cmd.replyto, 'Available colors:',
                Object.keys(irc.colors.codes).join(', '));

            break;

        default:
            break;
        }
    });

    // start fetching feeds right away if configured
    if (plugin.config.get('plugins.rss.autostart')) {
        plugin.log('Starting RSS feeds automatically.');
        startFetching();
    }
};
