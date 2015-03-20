module.exports = function (bot) {
    bot.listen(/(?:(\S+)[,:]\s+)?s\/((?:\\\/|[^\/])+)\/((?:\\\/|[^\/])+)(?:\/(\S+))?/, function (network, target, nick, text, match) {
        var othernick = match[1],
            search = match[2],
            replace = match[3],
            flags = match[4];

        var regex = new RegExp(search, flags);

        bot.get_buffer(network, target).slice(1).some(function (msg) {
            // check for messages from the other nick if specified, else the same nick
            // try not to match other substitutions, i.e. messages starting with s/
            if (msg.nick == (othernick || nick) && msg.text.slice(0, 2) != 's/') {
                var m = msg.text.match(regex);
                if (m) {
                    // send a message back to the channel with the correction
                    var pre = othernick ? (nick + ' thinks ' + othernick) : nick
                    bot.say(network, target, pre + ' meant to say: ' + msg.text.replace(regex, replace));
                    return true;
                }
            }
        });
    });
};
