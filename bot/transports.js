module.exports = function (bot) {
    var tptypes = {
        IRC: require('./transports/irc'),
        Telegram: require('./transports/telegram'),
    };
    var tpconfigs = bot.config.get('transports', {});

    bot.transports = {};
    for (tpname in tpconfigs) {
        var tpconfig = tpconfigs[tpname];
        for (tptype in tptypes) {
            if (tpconfig.type.toLowerCase() == tptype.toLowerCase()) {
                bot.transports[tpname] = new tptypes[tptype](bot, tpname, tpconfig);
            }
        }
    }
};
