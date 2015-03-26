module.exports = function (bot) {
    bot.listen('message#', '.*', function (msg) {
        // broadcast the message to all other channels the bot is connected to
        for (network in bot.networks) {
            for (channel in bot.networks[network].channels) {
                if (network != msg.network || channel != msg.target) {
                    var identifier = (network != msg.network ? (msg.network + ':') : '') + msg.target;
                    bot.say(network, channel, '<' + identifier + '> [' + msg.nick + '] ' + msg.text);
                }
            }
        }
    });
};
