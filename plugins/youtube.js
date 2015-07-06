var handlebars = require('handlebars');
var moment = require('moment');
var youtube = require('googleapis').youtube('v3');


var defaults = {
    url_template: '[YouTube] {{{title}}} | Length: {{length}} | Channel: {{channel}} | Uploaded: {{date}} | Views: {{views}} | +{{likes}} -{{dislikes}} | Comments: {{comments}}',
    search_template: '[YouTube] {{{title}}} | {{url}} | Length: {{length}} | Channel: {{channel}} | Uploaded: {{date}} | Views: {{views}} | +{{likes}} -{{dislikes}} | Comments: {{comments}}',
    date_format: 'YYYY-MM-DD'
};


var url_pattern = /(?:youtube.com\/watch\S*v=|youtu.be\/)([\w-]+)/;


module.exports = function (bot) {
    // add pattern to url exclusions so it doesn't also trigger the url plugin
    if (!bot.memory.url_exclusions) bot.memory.url_exclusions = [];
    bot.memory.url_exclusions.push(url_pattern);

    function getVideo(id, callback) {
        var apiKey = bot.config.get('plugins.youtube.api_key');
        if (!apiKey) return;

        youtube.videos.list({
            auth: apiKey,
            part: 'id,snippet,contentDetails,statistics',
            id: id,
        }, function (err, result) {
            if (err) return bot.error('Error fetching video details:', err.message);
            if (!result.items || !result.items.length) return bot.error('No data in YouTube request for video', id);
            bot.log('Fetched YouTube info for video', id);
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
                date: moment(video.snippet.publishedAt).format(bot.config.get('plugins.youtube.date_format', defaults.date_format)),
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

    bot.listen(url_pattern, function (msg) {
        bot.log('Got YouTube URL:', msg.match[0]);
        getVideo(msg.match[1], function (data) {
            var render_template = handlebars.compile(bot.config.get('plugins.youtube.url_template', defaults.url_template));
            bot.say(msg.network, msg.replyto, render_template(data));
        });
    });

    bot.addCommand(['youtube', 'yt'], function (cmd) {
        var apiKey = bot.config.get('plugins.youtube.api_key');
        if (!apiKey || !cmd.args) return;

        bot.log('Got YouTube search:', cmd.args);

        youtube.search.list({
            auth: apiKey,
            part: 'id',
            q: cmd.args,
            type: 'video',
            maxResults: 1,
        }, function (err, result) {
            if (err) return bot.error('Error searching videos:', err.message);
            if (!Array.isArray(result.items)) return bot.error('No items in YouTube results.');

            bot.log('Found %d result(s) for:', result.items.length, cmd.args);
            if (!result.items.length) {
                return bot.say(cmd.network, cmd.replyto, 'No video results found for %s.', cmd.args);
            }

            getVideo(result.items[0].id.videoId, function (data) {
                var render_template = handlebars.compile(bot.config.get('plugins.youtube.search_template', defaults.search_template));
                bot.say(cmd.network, cmd.replyto, render_template(data));
            });
        });
    });
};
