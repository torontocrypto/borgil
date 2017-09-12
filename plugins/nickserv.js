'use strict';

const extend = require('extend');


const defaultOpts = {
    nick_first: false,
    password: '',
    success: 'You are successfully identified',
    channels: [],
    channel_keywords: {},
};

function waitForIdentifySuccess(plugin, transport) {
    // Wait for an identification notice.
    transport.irc.once('notice', (from, to, text) => {
        const nsOpts = extend(true, {}, defaultOpts,
            plugin.config.get(`plugins.nickserv.networks.${transport.name}`, {}));

        if (from !== 'NickServ' || !text.match(nsOpts.success)) {
            waitForIdentifySuccess(plugin, transport);
            return;
        }

        plugin.log('%s: Identified with NickServ.', transport.name);

        // If we don't have our configured nick, request it.
        const nick = plugin.config.get(`transports.${transport.name}.nick`);
        if (to !== nick) {
            plugin.log('%s: Requesting nick %s.', transport.name, nick);
            transport.irc.send('NICK', nick);
        }

        // Join all NickServ-only channels.
        if (Array.isArray(nsOpts.channels) && nsOpts.channels.length) {
            plugin.log('%s: Joining %d NickServ-only channels.',
                transport.name, nsOpts.channels.length);

            nsOpts.channels.forEach(channel => transport.irc.join(
                (channel in (nsOpts.channel_keywords || {})) ?
                    `${channel} ${nsOpts.channel_keywords[channel]}` : channel));
        }
    });
}

module.exports = function nickServPlugin(plugin) {
    Object.keys(plugin.config.get('plugins.nickserv.networks', {})).forEach((tpName) => {
        const transport = plugin.transports[tpName];
        if (!transport || !transport.irc) {
            return;
        }

        // Wait for IRC registered event, and send identify info.
        transport.irc.on('registered', () => {
            const nick = plugin.config.get(`transports.${tpName}.nick`, '');
            const password = plugin.config.get(`plugins.nickserv.networks.${tpName}.password`,
                '');

            plugin.log('%s: Sending IDENTIFY to NickServ.', tpName);
            if (plugin.config.get(`plugins.nickserv.networks.${tpName}.nick_first`)) {
                transport.say('NickServ', 'IDENTIFY', nick, password);
            }
            else {
                transport.say('NickServ', 'IDENTIFY', password, nick);
            }

            waitForIdentifySuccess(plugin, transport);
        });
    });
};
