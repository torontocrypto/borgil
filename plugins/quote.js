'use strict';

const DataStore = require('nedb');
const extend = require('extend');
const handlebars = require('handlebars');
const path = require('path');


const defaultTemplates = {
    remember: 'Remembered {{from}} saying "{{text}}".',
    cantRememberWord: 'Sorry, I can\'t remember what {{from}} said about "{{word}}" recently.',
    cantRememberFrom: 'Sorry, I can\'t remember anything {{from}} said recently.',
    cantRemember: 'Sorry, I can\'t remember anyone saying anything recently.',
    quote: '<{{from}}> {{text}}',
    cantQuoteWord: 'Sorry, I don\'t have any quotes from {{from}} about "{{word}}".',
    cantQuoteFrom: 'Sorry, I don\'t have any quotes from {{from}}.',
    cantQuote: 'Sorry, I don\'t have any quotes. To save a quote, use ".remember".',
};


module.exports = function quotePlugin(plugin) {
    plugin.db = new DataStore({
        filename: path.join(plugin.config.get('dbdir', ''), 'quote.plugin.db'),
        autoload: true,
    });

    plugin.addCommand('remember', (cmd) => {
        const args = cmd.args.split(/\s+/);
        const nick = args[0];
        const word = args[1];

        const templates = extend({}, defaultTemplates,
            plugin.config.get('plugins.quote.templates', {}));

        // Search the channel buffer for matching messages.
        const buffer = (plugin.buffers[cmd.transport.name] || {})[cmd.replyto] || [];
        if (!buffer.some((msg) => {
            // Exclude command messages.
            if (msg.command) {
                return false;
            }

            if ((!nick || msg.from === nick) &&
                (!word || new RegExp(`\\b${word}\\b`, 'i').test(msg.text))) {
                // Add the transport name and store the message in the quote database.
                plugin.db.insert(Object.assign(msg, {transport: cmd.transport.name}),
                    (err, quote) => {
                        if (err) {
                            return plugin.log('Error saving quote on %s/%s:',
                                cmd.transport.name, msg.replyto, msg.text);
                        }
                        const renderTemplate = handlebars.compile(templates.remember);
                        cmd.transport.say(cmd.replyto, renderTemplate(quote));
                    });
                return true;
            }
            return false;
        })) {
            let renderTemplate;

            if (word) {
                renderTemplate = handlebars.compile(templates.cantRememberWord);
            }
            else if (nick) {
                renderTemplate = handlebars.compile(templates.cantRememberFrom);
            }
            else {
                renderTemplate = handlebars.compile(templates.cantRemember);
            }
            cmd.transport.say(cmd.replyto, renderTemplate({
                from: nick || '',
                word: word || '',
            }));
        }
    });

    plugin.addCommand('quote', (cmd) => {
        const args = cmd.args.split(/\s+/);
        const nick = args[0];
        const word = args[1];

        const filter = {
            transport: cmd.transport.name,
            replyto: cmd.replyto,
        };
        if (nick) {
            filter.from = nick;
        }
        if (word) {
            filter.text = new RegExp(`\\b${word}\\b`, 'i');
        }

        plugin.db.find(filter, (err, quotes) => {
            if (err) {
                return plugin.error('Error fetching quote:', err.message);
            }

            const templates = extend({}, defaultTemplates,
                plugin.config.get('plugins.quote.templates', {}));
            let renderTemplate;

            if (!quotes.length) {
                if (word) {
                    renderTemplate = handlebars.compile(templates.cantQuoteWord);
                }
                else if (nick) {
                    renderTemplate = handlebars.compile(templates.cantQuoteFrom);
                }
                else {
                    renderTemplate = handlebars.compile(templates.cantQuote);
                }
                cmd.transport.say(cmd.replyto, renderTemplate({
                    from: nick || '',
                    word: word || '',
                }));
                return;
            }

            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            renderTemplate = handlebars.compile(templates.quote);
            cmd.transport.say(cmd.replyto, renderTemplate(quote));
        });
    });
};
