var extend = require('extend');


var default_opts = {
    nick_first: false,
    password: '',
    success: 'You are successfully identified',
    channels: [],
    channel_keywords: {}
};


module.exports = function () {
    for (tpname in this.config.get('plugins.nickserv.networks', {})) {
        var transport = this.transports[tpname];
        if (!transport || !transport.irc) {
            continue;
        }

        var plugin = this;

        // Wait for IRC registered event, and send identify info.
        transport.irc.on('registered', function () {
            var nick = plugin.config.get('transports.' + tpname + '.nick', '');
            var password = plugin.config.get('plugins.nickserv.networks.' + tpname + '.password',
                '');

            plugin.log('%s: Sending IDENTIFY to NickServ.', tpname);
            if (plugin.config.get('plugins.nickserv.networks.' + tpname + '.nick_first')) {
                transport.say('NickServ', 'IDENTIFY', nick, password);
            }
            else {
                transport.say('NickServ', 'IDENTIFY', password, nick);
            }

            waitForIdentifySuccess.call(plugin, transport);
        });
    }
};

function waitForIdentifySuccess(transport) {
    var plugin = this;

    // Wait for an identification notice.
    transport.irc.once('notice', function (from, to, text, msg) {
        var nsOpts = extend(true, {}, default_opts,
            plugin.config.get('plugins.nickserv.networks.' + transport.name, {}));

        if (from !== 'NickServ' || !text.match(nsOpts.success)) {
            waitForIdentifySuccess.call(plugin, transport);
            return;
        }

        plugin.log('%s: Identified with NickServ.', transport.name);

        // If we don't have our configured nick, request it.
        var nick = plugin.config.get('transports.' + transport.name + '.nick');
        if (to !== nick) {
            plugin.log('%s: Requesting nick %s.', transport.name, nick);
            transport.irc.send('NICK', nick);
        }

        // Join all NickServ-only channels.
        if (Array.isArray(nsOpts.channels) && nsOpts.channels.length) {
            plugin.log('%s: Joining %d NickServ-only channels.',
                transport.name, nsOpts.channels.length);

            nsOpts.channels.forEach(function (channel) {
                if (channel in (nsOpts.channel_keywords || {})) {
                    channel += ' ' + nsOpts.channel_keywords[channel];
                }
                transport.irc.join(channel);
            });
        }
    });
}
