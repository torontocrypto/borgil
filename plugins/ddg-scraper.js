var cheerio = require('cheerio');
var handlebars = require('handlebars');
var request = require('request');


var default_template = '[DDG] {{{title}}} | {{url}}';

module.exports = function (bot) {
    bot.addCommand(['s', 'search'], function (cmd) {
        bot.log('Got search term:', cmd.text);
        request.get('https://duckduckgo.com/html?q=' + cmd.text, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var $ = cheerio.load(body),
                    $result = $('div#links .web-result').not('.web-result-sponsored').first().find('a.large');

                if (!$result.length) return;

                var data = {
                    title: $result.text(),
                    url: $result.attr('href'),
                };
                var render_template = handlebars.compile(bot.config.get('plugins.ddg-scraper.template', default_template));
                bot.log('Echoing search result:', data.url);
                bot.say(cmd.network, cmd.replyto, render_template(data));
            }
        });
    });
};
