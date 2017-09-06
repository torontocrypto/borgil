module.exports = function (bot) {
    var tptypes = {
        IRC: require('./transports/irc'),
        Telegram: require('./transports/telegram'),
    };
    var tpconfigs = bot.config.get('transports', {});

    var numtransports = Object.keys(tpconfigs).length;
    if (numtransports) {
        bot.log.info('Found %d transport(s) in configuration.', numtransports);
    }
    else {
        bot.log.warn('No transports configured.')
    }

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
