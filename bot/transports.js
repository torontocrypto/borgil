'use strict';

const IRC = require('./transports/irc');
const Telegram = require('./transports/telegram');


module.exports = function initTransports(bot) {
    const tptypes = {
        IRC,
        Telegram,
    };
    const tpconfigs = bot.config.get('transports', {});

    const numtransports = Object.keys(tpconfigs).length;
    if (numtransports) {
        bot.log.info('Found %d transport(s) in configuration.', numtransports);
    }
    else {
        bot.log.warn('No transports configured.');
    }

    bot.transports = {};
    Object.keys(tpconfigs).forEach((tpname) => {
        const tpconfig = tpconfigs[tpname];
        Object.keys(tptypes).forEach((tptype) => {
            if (tpconfig.type.toLowerCase() === tptype.toLowerCase()) {
                bot.transports[tpname] = new tptypes[tptype](bot, tpname, tpconfig);
            }
        });
    });
};
