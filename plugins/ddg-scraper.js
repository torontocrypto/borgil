var cheerio = require('cheerio');
var handlebars = require('handlebars');
var request = require('request');


var default_template = '[DDG] {{{title}}} | {{url}}';

module.exports = function () {
    this.addCommand(['ddg', 'duck', 's', 'search'], function (cmd) {
        this.log('Got search term:', cmd.args);

        var plugin = this;
        // DuckDuckGo has no public API for their syndicated search results.
        // So let's scrape the page! Of course this will break if they change their layout.
        request.get('https://duckduckgo.com/html?q=' + cmd.args, function (err, res, body) {
            if (err) return plugin.error('Error searching DuckDuckGo:', err.message);
            if (res.statusCode != 200) return plugin.error('Got status code %d searching DuckDuckGo', res.statusCode);

            var $ = cheerio.load(body),
                $result = $('div#links .web-result').not('.web-result-sponsored').first().find('a.large');

            if (!$result.length) {
                return cmd.transport.say(cmd.replyto, 'No search results found for %s.', cmd.args);
            }

            var data = {
                title: $result.text(),
                url: $result.attr('href'),
            };
            var render_template = handlebars.compile(plugin.config.get('plugins.ddg-scraper.template', default_template));
            plugin.log('Echoing search result for %s:', cmd.args, data.url);
            cmd.transport.say(cmd.replyto, render_template(data));
        });
    });
};
