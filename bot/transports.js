module.exports = function () {
    var tptypes = {
        IRC: require('./transports/irc'),
        Telegram: require('./transports/telegram'),
    };
    var tpconfigs = this.config.get('transports', {});

    this.transports = {};
    for (tpname in tpconfigs) {
        var tpconfig = tpconfigs[tpname];
        for (tptype in tptypes) {
            if (tpconfig.type.toLowerCase() == tptype.toLowerCase()) {
                this.transports[tpname] = new tptypes[tptype](this, tpname, tpconfig);
            }
        }
    }
};
