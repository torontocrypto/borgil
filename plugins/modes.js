'use strict';

module.exports = function modesPlugin(plugin) {
    const modes = plugin.config.get('plugins.modes', {});
    Object.keys(modes).forEach((tpName) => {
        const transport = plugin.transports[tpName];
        if (!transport || !transport.irc) {
            return;
        }

        // Wait for the IRC registered event, and send a raw MODE command.
        transport.on('registered', () => {
            plugin.log('Setting mode on %s:', tpName, modes[tpName]);
            transport.irc.send('MODE', modes[tpName]);
        });
    });
};
