'use strict';

const handlebars = require('handlebars');
const Entities = require('html-entities').AllHtmlEntities;
const request = require('request');


const defaultTemplate = '[ {{{title}}} ] - {{domain}}';

const entities = new Entities();

module.exports = function urlPlugin(plugin) {
    // fetch title for URLs and echo it into the channel
    plugin.listen(/https?:\/\/([^/\s]+)\S*/i, (msg) => {
        // cancel if the message matches any patterns placed in url_exclusions by other plugins
        if ((plugin.memory.url_exclusions || []).some(pattern => !!msg.text.match(pattern))) {
            return;
        }

        const url = msg.match[0];
        const domain = msg.match[1];
        plugin.log('Got URL:', url);

        request.get(url, (err, res, body) => {
            if (!err && res.statusCode === 200) {
                const t = body.match(/<title>\s*(.*?)\s*<\/title>/i);
                if (!t || !t[1].length) {
                    return;
                }

                const data = {
                    domain,
                    title: entities.decode(t[1]),
                    url,
                };
                const renderTemplate = handlebars.compile(plugin.config.get('plugins.url.template',
                    defaultTemplate));
                plugin.log('Echoing URL title:', data.title);
                msg.transport.say(msg.replyto, renderTemplate(data));
            }
        });
    });
};
