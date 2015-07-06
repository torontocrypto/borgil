var cheerio = require('cheerio');
var handlebars = require('handlebars');
var request = require('request');


var default_template = '[DDG] {{{title}}} | {{url}}';

module.exports = function (bot) {
    bot.addCommand(['s', 'search'], function (cmd) {
        bot.log('Got search term:', cmd.args);
        // DuckDuckGo has no public API for their syndicated search results.
        // So let's scrape the page! Of course this will break if they change their layout.
        request.get('https://duckduckgo.com/html?q=' + cmd.args, function (err, res, body) {
            if (err) return bot.error('Error searching DuckDuckGo:', err.message);
            if (res.statusCode != 200) return bot.error('Got status code %d searching DuckDuckGo', res.statusCode);

            var $ = cheerio.load(body),
                $result = $('div#links .web-result').not('.web-result-sponsored').first().find('a.large');

            if (!$result.length) {
                return bot.say(cmd.network, cmd.replyto, 'No search results found for %s.', cmd.args);
            }

            var data = {
                title: $result.text(),
                url: $result.attr('href'),
            };
            var render_template = handlebars.compile(bot.config.get('plugins.ddg-scraper.template', default_template));
            bot.log('Echoing search result for %s:', cmd.args, data.url);
            bot.say(cmd.network, cmd.replyto, render_template(data));
        });
    });
};
