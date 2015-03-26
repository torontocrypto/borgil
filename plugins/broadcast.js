module.exports = function (bot) {
    bot.listen('message', '.*', function (msg) {
        bot.get_networks().forEach(function (nw) {
            bot.get_channels(nw).forEach(function (ch) {
                if (nw != msg.network || ch != msg.target) {
                    var identifier = (nw != msg.network ? (msg.network + ':') : '') + msg.target;
                    bot.say(nw, ch, '<' + identifier + '> [' + msg.nick + '] ' + msg.text);
                }
            });
        });
    });
};
