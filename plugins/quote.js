var DataStore = require('nedb');
var extend = require('extend');
var handlebars = require('handlebars');
var path = require('path');


var default_templates = {
    remember: 'Remembered {{from}} saying "{{text}}".',
    cantRememberWord: 'Sorry, I can\'t remember what {{from}} said about "{{word}}" recently.',
    cantRememberFrom: 'Sorry, I can\'t remember anything {{from}} said recently.',
    cantRemember: 'Sorry, I can\'t remember anyone saying anything recently.',
    quote: '<{{from}}> {{text}}',
    cantQuoteWord: 'Sorry, I don\'t have any quotes from {{from}} about "{{word}}".',
    cantQuoteFrom: 'Sorry, I don\'t have any quotes from {{from}}.',
    cantQuote: 'Sorry, I don\'t have any quotes. To save a quote, use ".remember".',
};


module.exports = function (plugin) {
    plugin.db = new DataStore({
        filename: path.join(plugin.config.get('dbdir', ''), 'quote.db'),
        autoload: true
    });

    var render_template;

    plugin.addCommand('remember', function (cmd) {
        var args = cmd.args.split(/\s+/),
            nick = args[0],
            word = args[1];

        var templates = extend({}, default_templates,
            plugin.config.get('plugins.quote.templates', {}));

        // Search the channel buffer for matching messages.
        var buffer = (plugin.buffers[cmd.transport.name] || {})[cmd.replyto] || [];
        if (!buffer.some(function (msg) {
            // Exclude command messages.
            if (msg.command) return false;

            if ((!nick || msg.from == nick) &&
                    (!word || msg.text.match(new RegExp('\\b' + word + '\\b', 'i')))) {
                // Add the transport name.
                msg.transport = cmd.transport.name;

                // Store the message in the quote database.
                plugin.db.insert(msg, function (err, quote) {
                    if (err) {
                        return plugin.log('Error saving quote on %s/%s:', msg.transport, msg.replyto, msg.text);
                    }
                    render_template = handlebars.compile(templates.remember);
                    cmd.transport.say(cmd.replyto, render_template(quote));
                });
                return true;
            }
        })) {
            if (word) {
                render_template = handlebars.compile(templates.cantRememberWord);
            }
            else if (nick) {
                render_template = handlebars.compile(templates.cantRememberFrom);
            }
            else {
                render_template = handlebars.compile(templates.cantRemember);
            }
            cmd.transport.say(cmd.replyto, render_template({
                from: nick || '',
                word: word || '',
            }));
        }
    });

    plugin.addCommand('quote', function (cmd) {
        var args = cmd.args.split(/\s+/),
            nick = args[0],
            word = args[1];

        var filter = {
            transport: cmd.transport.name,
            replyto: cmd.replyto,
        };
        if (nick) filter.from = nick;

        plugin.db.find(filter, function (err, quotes) {
            if (err) return plugin.error('Error fetching quote:', err.message);

            var templates = extend({}, default_templates,
                plugin.config.get('plugins.quote.templates', {}));
            var render_template;

            if (word) quotes = quotes.filter(function (quote) {
                return quote.text.match(new RegExp('\\b' + word + '\\b', 'i'));
            });

            if (!quotes.length) {
                if (word) {
                    render_template = handlebars.compile(templates.cantQuoteWord);
                }
                else if (nick) {
                    render_template = handlebars.compile(templates.cantQuoteFrom);
                }
                else {
                    render_template = handlebars.compile(templates.cantQuote);
                }
                cmd.transport.say(cmd.replyto, render_template({
                    from: nick || '',
                    word: word || '',
                }));
                return;
            }

            var quote = quotes[Math.floor(Math.random() * quotes.length)];
            render_template = handlebars.compile(templates.quote);
            cmd.transport.say(cmd.replyto, render_template(quote));
        });
    });
};
