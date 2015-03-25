module.exports = function (bot) {
    bot.listen('message', '.*', function (network, target, nick, text, match) {
        bot.get_networks().forEach(function (nw) {
            bot.get_channels(nw).forEach(function (ch) {
                if (nw != network || ch != target) {
                    var identifier = (nw != network ? (network + ':') : '') + target;
                    bot.say(nw, ch, '<' + identifier + '> [' + nick + '] ' + text);
                }
            });
        });
    });
};
