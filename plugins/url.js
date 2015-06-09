var handlebars = require('handlebars');
var request = require('request');


var default_template = '[ {{{title}}} ] - {{domain}}';

module.exports = function (bot) {
    // fetch title for URLs and echo it into the channel
    bot.listen('message#', /https?:\/\/([^\/\s]+)\S*/i, function (msg) {
        // cancel if the message matches any patterns placed in url_exclusions by other plugins
        if ((bot.memory.url_exclusions || []).some(function (pattern) {
            return !!msg.text.match(pattern);
        })) return;

        var url = msg.match[0],
            domain = msg.match[1];

        request.get(url, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var t = body.match(/<title>\s*(.*?)\s*<\/title>/i);
                if (!t || !t[1].length) return;

                var render_template = handlebars.compile(bot.config.get('plugins.url.template') || default_template);
                bot.say(msg.network, msg.replyto, render_template({
                    domain: domain,
                    title: t[1],
                    url: url,
                }));
            }
        });
    });
};
