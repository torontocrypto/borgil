var DataStore = require('nedb');
var path = require('path');


module.exports = function (bot) {
    var db = new DataStore({
        filename: path.join(bot.config.get('dbdir', ''), 'quote.db'),
        autoload: true,
    });

    bot.addCommand('remember', function (cmd) {
        var args = cmd.args.split(/\s+/),
            nick = args[0],
            word = args[1];

        if (!nick) return bot.say(cmd.network, cmd.replyto, 'Usage: .remember <nick> [<word>]');

        // search channel buffer
        var buffer = (bot.buffers[cmd.network] || {})[cmd.replyto] || [];
        if (!buffer.some(function (msg) {
            // exclude command messages
            if (msg.text.match(bot.getCommandRegex())) return false;

            if (msg.nick == nick && (!word || msg.text.match(new RegExp('\\b' + word + '\\b', 'i')))) {
                db.insert({
                    network: cmd.network,
                    channel: cmd.replyto,
                    msg: msg,
                }, function (err, quote) {
                    if (quote) bot.say(cmd.network, cmd.replyto, 'Remembered %s saying:', quote.msg.nick, quote.msg.text);
                });
                return true;
            }
        })) {
            if (word) bot.say(cmd.network, cmd.replyto, 'Sorry, I can\'t remember what %s said about "%s" recently.', nick, word);
            else bot.say(cmd.network, cmd.replyto, 'Sorry, I can\'t remember anything %s said recently.', nick);
        }
    });

    bot.addCommand('quote', function (cmd) {
        var args = cmd.args.split(/\s+/),
            nick = args[0],
            word = args[1];

        var filter = {
            network: cmd.network,
            channel: cmd.replyto,
        };
        if (nick) filter['msg.nick'] = nick;

        db.find(filter, function (err, quotes) {
            if (err) return bot.error('Error fetching quote:', err.message);

            if (word) quotes = quotes.filter(function (quote) {
                return quote.msg.text.match(new RegExp('\\b' + word + '\\b', 'i'));
            });

            if (!quotes.length) {
                if (word) bot.say(cmd.network, cmd.replyto, 'Sorry, I don\'t have any quotes from %s about "%s".', nick, word);
                else if (nick) bot.say(cmd.network, cmd.replyto, 'Sorry, I don\'t have any quotes from %s.', nick);
                else bot.say(cmd.network, cmd.replyto, 'Sorry, I don\'t have any quotes. To save a quote, use ".remember".');
                return;
            }

            var quote = quotes[Math.floor(Math.random() * quotes.length)];
            bot.say(cmd.network, cmd.replyto, '<%s>', quote.msg.nick, quote.msg.text);
        });
    });
};
