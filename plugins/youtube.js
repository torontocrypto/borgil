'use strict';

const handlebars = require('handlebars');
const moment = require('moment-timezone');
const youtube = require('googleapis').youtube('v3');


const defaults = {
    url_template: '[YouTube] {{{title}}} | Length: {{length}} | Channel: {{channel}} | ' +
        'Uploaded: {{date}} | Views: {{views}} | +{{likes}} -{{dislikes}} | ' +
        'Comments: {{comments}}',
    search_template: '[YouTube] {{{title}}} | {{url}} | Length: {{length}} | ' +
        'Channel: {{channel}} | Uploaded: {{date}} | Views: {{views}} | ' +
        '+{{likes}} -{{dislikes}} | Comments: {{comments}}',
    date_format: 'YYYY-MM-DD',
};

const urlPattern = /(?:youtube.com\/watch\S*v=|youtu.be\/)([\w-]+)/;

module.exports = function youtubePlugin(plugin) {
    // add pattern to url exclusions so it doesn't also trigger the url plugin
    if (!plugin.memory.has('url_exclusions')) {
        plugin.memory.set('url_exclusions', []);
    }
    plugin.memory.get('url_exclusions').push(urlPattern);

    function getVideo(id, callback) {
        const apiKey = plugin.config.get('plugins.youtube.api_key');
        if (!apiKey) {
            return;
        }

        youtube.videos.list({
            auth: apiKey,
            part: 'id,snippet,contentDetails,statistics',
            id,
        }, (err, result) => {
            if (err) {
                return plugin.error('Error fetching video details:', err.message);
            }
            if (!result.items || !result.items.length) {
                return plugin.error('No data in YouTube request for video', id);
            }
            plugin.log('Fetched YouTube info for video', id);
            const video = result.items[0];

            // format length
            const seconds = moment.duration(video.contentDetails.duration).asSeconds();
            const length = moment.utc(0).seconds(seconds)
                .format(seconds >= 3600 ? 'H:mm:ss' : 'm:ss');

            const publishDate = moment(video.snippet.publishedAt);
            const timezone = plugin.config.get('plugins.youtube.timezone');
            if (timezone) {
                publishDate.tz(timezone);
            }

            // parse data
            callback({
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                url: `https://www.youtube.com/watch?v=${video.id}`,
                date: publishDate.format(plugin.config.get('plugins.youtube.date_format',
                    defaults.date_format)),
                channel: video.snippet.channelTitle,
                tags: video.snippet.tags,
                length,
                views: video.statistics.viewCount,
                likes: video.statistics.likeCount,
                dislikes: video.statistics.dislikeCount,
                favorites: video.statistics.favoriteCount,
                comments: video.statistics.commentCount,
            });
        });
    }

    plugin.listen(urlPattern, (msg) => {
        plugin.log('Got YouTube URL:', msg.match[0]);
        const renderTemplate = handlebars.compile(plugin.config.get('plugins.youtube.url_template',
            defaults.url_template));
        getVideo(msg.match[1], (data) => {
            msg.transport.say(msg.replyto, renderTemplate(data));
        });
    });

    plugin.addCommand(['youtube', 'yt'], (cmd) => {
        const apiKey = plugin.config.get('plugins.youtube.api_key');
        if (!apiKey || !cmd.args) {
            return;
        }

        plugin.log('Got YouTube search:', cmd.args);

        youtube.search.list({
            auth: apiKey,
            part: 'id',
            q: cmd.args,
            type: 'video',
            maxResults: 1,
        }, (err, result) => {
            if (err) {
                return plugin.error('Error searching videos:', err.message);
            }
            if (!Array.isArray(result.items)) {
                return plugin.error('No items in YouTube results.');
            }

            plugin.log('Found %d result(s) for:', result.items.length, cmd.args);
            if (!result.items.length) {
                return cmd.transport.say(cmd.replyto, 'No video results found for %s.', cmd.args);
            }

            getVideo(result.items[0].id.videoId, (data) => {
                const renderTemplate = handlebars.compile(
                    plugin.config.get('plugins.youtube.search_template', defaults.search_template));
                cmd.transport.say(cmd.replyto, renderTemplate(data));
            });
        });
    });
};
