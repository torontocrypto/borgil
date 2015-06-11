var handlebars = require('handlebars');
var Entities = require('html-entities').AllHtmlEntities;
var request = require('request');


var default_template = '[ {{{title}}} ] - {{domain}}';

var entities = new Entities();

module.exports = function (bot) {
    // fetch title for URLs and echo it into the channel
    bot.listen('message#', /https?:\/\/([^\/\s]+)\S*/i, function (msg) {
        // cancel if the message matches any patterns placed in url_exclusions by other plugins
        if ((bot.memory.url_exclusions || []).some(function (pattern) {
            return !!msg.text.match(pattern);
        })) return;

        var url = msg.match[0],
            domain = msg.match[1];
        bot.log('Got URL:', url);

        request.get(url, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var t = body.match(/<title>\s*(.*?)\s*<\/title>/i);
                if (!t || !t[1].length) return;

                var data = {
                    domain: domain,
                    title: entities.decode(t[1]),
                    url: url,
                };
                var render_template = handlebars.compile(bot.config.get('plugins.url.template') || default_template);
                bot.log('Echoing URL title:', data.title);
                bot.say(msg.network, msg.replyto, render_template(data));
            }
        });
    });
};
