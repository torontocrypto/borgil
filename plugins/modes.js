module.exports = function () {
    var plugin = this;
    var modes = this.config.get('plugins.modes', {});
    for (tpname in modes) {
        var transport = this.transports[tpname];
        if (!transport || !transport.irc) {
            continue;
        }

        // Wait for the IRC registered event, and send a raw MODE command.
        transport.on('registered', function () {
            plugin.log('Setting mode on %s:', tpname, modes[tpname]);
            transport.irc.send('MODE', modes[tpname]);
        });
    }
};
