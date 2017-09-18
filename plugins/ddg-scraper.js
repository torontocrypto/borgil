'use strict';

const cheerio = require('cheerio');
const handlebars = require('handlebars');
const request = require('request');


const defaultTemplate = '[DDG] {{{title}}} | {{url}}';

module.exports = function ddgScraperPlugin(plugin) {
    plugin.addCommand(['ddg', 'duck', 's', 'search'], (cmd) => {
        plugin.log('Got search term:', cmd.args);

        // DuckDuckGo has no public API for their syndicated search results.
        // So let's scrape the page! Of course this will break if they change their layout.
        request.get(`https://duckduckgo.com/html?q=${cmd.args}`, (err, res, body) => {
            if (err) {
                return plugin.error('Error searching DuckDuckGo:', err.message);
            }
            if (res.statusCode !== 200) {
                return plugin.error('Got status code %d searching DuckDuckGo', res.statusCode);
            }

            const $ = cheerio.load(body);
            const $result = $('div#links .web-result').not('.web-result-sponsored').first()
                .find('a.large');

            if (!$result.length) {
                return cmd.transport.say(cmd.replyto, 'No search results found for %s.', cmd.args);
            }

            const data = {
                title: $result.text(),
                url: $result.attr('href'),
            };
            const renderTemplate = handlebars.compile(
                plugin.config.get('plugins.ddg-scraper.template', defaultTemplate));
            plugin.log('Echoing search result for %s:', cmd.args, data.url);
            cmd.transport.say(cmd.replyto, renderTemplate(data));
        });
    });
};
