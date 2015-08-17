var DataStore = require('nedb');
var path = require('path');


module.exports = function () {
    var db = new DataStore({
        filename: path.join(this.config.get('dbdir', ''), 'quote.db'),
        autoload: true,
    });

    var plugin = this;

    this.addCommand('remember', function (cmd) {
        var args = cmd.args.split(/\s+/),
            nick = args[0],
            word = args[1];

        if (!nick) return cmd.transport.say(cmd.replyto, 'Usage: .remember <nick> [<word>]');

        // Search the channel buffer for matching messages.
        var buffer = (this.buffers[cmd.transport.name] || {})[cmd.replyto] || [];
        if (!buffer.some(function (msg) {
            // Exclude command messages.
            if (msg.command) return false;

            if (msg.from == nick && (!word || msg.text.match(new RegExp('\\b' + word + '\\b', 'i')))) {
                db.insert({
                    network: cmd.transport.name,
                    channel: cmd.replyto,
                    msg: msg,
                }, function (err, quote) {
                    if (quote) cmd.transport.say(cmd.replyto, 'Remembered %s saying:', quote.msg.from, quote.msg.text);
                });
                return true;
            }
        })) {
            if (word) cmd.transport.say(cmd.replyto, 'Sorry, I can\'t remember what %s said about "%s" recently.', nick, word);
            else cmd.transport.say(cmd.replyto, 'Sorry, I can\'t remember anything %s said recently.', nick);
        }
    });

    this.addCommand('quote', function (cmd) {
        var args = cmd.args.split(/\s+/),
            nick = args[0],
            word = args[1];

        var filter = {
            network: cmd.network,
            channel: cmd.replyto,
        };
        if (nick) filter['msg.nick'] = nick;

        db.find(filter, function (err, quotes) {
            if (err) return plugin.error('Error fetching quote:', err.message);

            if (word) quotes = quotes.filter(function (quote) {
                return quote.msg.text.match(new RegExp('\\b' + word + '\\b', 'i'));
            });

            if (!quotes.length) {
                if (word) cmd.transport.say(cmd.replyto, 'Sorry, I don\'t have any quotes from %s about "%s".', nick, word);
                else if (nick) cmd.transport.say(cmd.replyto, 'Sorry, I don\'t have any quotes from %s.', nick);
                else cmd.transport.say(cmd.replyto, 'Sorry, I don\'t have any quotes. To save a quote, use ".remember".');
                return;
            }

            var quote = quotes[Math.floor(Math.random() * quotes.length)];
            cmd.transport.say(cmd.replyto, '<%s>', quote.msg.nick, quote.msg.text);
        });
    });
};
