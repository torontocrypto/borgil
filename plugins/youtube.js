var handlebars = require('handlebars');
var moment = require('moment');
var youtube = require('googleapis').youtube('v3');


var defaults = {
    url_template: '[YouTube] {{{title}}} | Length: {{length}} | Channel: {{channel}} | Uploaded: {{date}} | Views: {{views}} | +{{likes}} -{{dislikes}} | Comments: {{comments}}',
    search_template: '[YouTube] {{{title}}} | {{url}} | Length: {{length}} | Channel: {{channel}} | Uploaded: {{date}} | Views: {{views}} | +{{likes}} -{{dislikes}} | Comments: {{comments}}',
    date_format: 'YYYY-MM-DD'
};

var url_pattern = /(?:youtube.com\/watch\S*v=|youtu.be\/)([\w-]+)/;

module.exports = function () {
    // add pattern to url exclusions so it doesn't also trigger the url plugin
    if (!this.memory.url_exclusions) this.memory.url_exclusions = [];
    this.memory.url_exclusions.push(url_pattern);

    var plugin = this;

    this.listen(url_pattern, function (msg) {
        this.log('Got YouTube URL:', msg.match[0]);
        var render_template = handlebars.compile(this.config.get('plugins.youtube.url_template', defaults.url_template));
        getVideo(msg.match[1], function (data) {
            msg.transport.say(msg.replyto, render_template(data));
        });
    });

    this.addCommand(['youtube', 'yt'], function (cmd) {
        var apiKey = this.config.get('plugins.youtube.api_key');
        if (!apiKey || !cmd.args) return;

        this.log('Got YouTube search:', cmd.args);

        youtube.search.list({
            auth: apiKey,
            part: 'id',
            q: cmd.args,
            type: 'video',
            maxResults: 1,
        }, function (err, result) {
            if (err) return plugin.error('Error searching videos:', err.message);
            if (!Array.isArray(result.items)) return plugin.error('No items in YouTube results.');

            plugin.log('Found %d result(s) for:', result.items.length, cmd.args);
            if (!result.items.length) {
                return cmd.transport.say(cmd.replyto, 'No video results found for %s.', cmd.args);
            }

            getVideo(result.items[0].id.videoId, function (data) {
                var render_template = handlebars.compile(plugin.config.get('plugins.youtube.search_template', defaults.search_template));
                cmd.transport.say(cmd.replyto, render_template(data));
            });
        });
    });

    function getVideo(id, callback) {
        var apiKey = plugin.config.get('plugins.youtube.api_key');
        if (!apiKey) return;

        youtube.videos.list({
            auth: apiKey,
            part: 'id,snippet,contentDetails,statistics',
            id: id,
        }, function (err, result) {
            if (err) return plugin.error('Error fetching video details:', err.message);
            if (!result.items || !result.items.length) return plugin.error('No data in YouTube request for video', id);
            plugin.log('Fetched YouTube info for video', id);
            var video = result.items[0];

            // format length
            var seconds = moment.duration(video.contentDetails.duration).asSeconds(),
                length = moment.utc(0).seconds(seconds).format(seconds >= 3600 ? 'H:mm:ss' : 'm:ss');

            // parse data
            callback({
                id: video.id,
                title: video.snippet.title,
                description: video.snippet.description,
                url: 'https://www.youtube.com/watch?v=' + video.id,
                date: moment(video.snippet.publishedAt).format(plugin.config.get('plugins.youtube.date_format', defaults.date_format)),
                channel: video.snippet.channelTitle,
                tags: video.snippet.tags,
                length: length,
                views: video.statistics.viewCount,
                likes: video.statistics.likeCount,
                dislikes: video.statistics.dislikeCount,
                favorites: video.statistics.favoriteCount,
                comments: video.statistics.commentCount,
            });
        });
    }
};
