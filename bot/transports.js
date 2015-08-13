module.exports = function () {
    var tptypes = {
        IRC: require('./transports/irc'),
        Telegram: require('./transports/telegram'),
    };
    var tpconfigs = this.config.get('transports', {});

    this.transports = {};
    for (tpname in tpconfigs) {
        var tpconfig = tpconfigs[tpname];
        if (tpconfig.type in tptypes) {
            this.transports[tpname] = new tptypes[tpconfig.type](this, tpname, tpconfig);
        }
    }
};
