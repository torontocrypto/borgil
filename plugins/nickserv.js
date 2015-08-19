var extend = require('extend');


var waitingForNickServ = {};

var default_opts = {
    nick_first: false,
    password: '',
    success: 'You are successfully identified',
    channels: [],
    channel_keywords: {}
};


// Listener for NickServe notice events.
// function checkForIdentifySuccess(network, nick, target, text, msg) {
//     var nickserv_opts = extend({}, default_opts,
//         this.config.get('plugins.nickserv.networks.' + network, {}));
//
//     if ((waitingForNickServ[network]) &&
//             nick == 'NickServ' &&
//             text.match(nickserv_opts.success)) {
//         this.log('%s: Identified with NickServ.', network);
//
//         // Change our nick if it is currently not correct.
//         if (target != this.networks[network].config.nick) {
//             this.log('%s: Nick is currently %s, requesting change to %s.',
//                 network, target, this.networks[network].config.nick);
//             this.sendRaw(network, 'NICK', this.networks[network].config.nick);
//         }
//
//         // Join all NickServ-only channels on this network.
//         if (Array.isArray(nickserv_opts.channels) && nickserv_opts.channels.length) {
//             this.log('%s: Joining %d NickServ-only channel(s).',
//                 network, nickserv_opts.channels.length);
//             nickserv_opts.channels.forEach(function (channel) {
//                 if (channel in (nickserv_opts.channel_keywords || {})) {
//                     channel += ' ' + nickserv_opts.channel_keywords[channel];
//                 }
//                 this.join(network, channel);
//             }, this);
//         }
//
//         delete waitingForNickServ[network];
//     }
//     else {
//         // Not the message we are waiting for, so reassign the listener.
//         this.once('notice', checkForIdentifySuccess);
//     }
// }


function waitForIdentifySuccess(transport, nsOpts) {
    var plugin = this;

    transport.irc.once('notice', function (nick, to, text, msg) {
        if (nick !== 'NickServ' || !text.match(nsOpts.success)) {
            waitForIdentifySuccess(transport, nsOpts);
            return;
        }

        plugin.log('%s: Identified with NickServ.', transport.name);

        if (Array.isArray(nsOpts.channels) && nsOpts.channels.length) {
            plugin.log('%s: Joining %d NickServ-only channels.',
                transport.name, nsOpts.channels.length);

            nsOpts.channels.forEach(function (channel) {
                if (channel in (nsOpts.channel_keywords || {})) {
                    channel += ' ' + nsOpts.channel_keywords[channel];
                }
                transport.join(channel);
            });
        }
    });
}


module.exports = function () {
    var plugin = this;

    var nsTransportOpts = this.config.get('plugins.nickserv.networks', {});
    for (tpname in nsTransportOpts) {
        var transport = this.transports[tpname];
        if (!transport || !transport.irc) {
            continue;
        }

        var nsOpts = extend({}, default_opts, nsTransportOpts[tpname]);
        var nick = this.config.get('transports.' + tpname + '.nick', '');
        if (!nsOpts.password) {
            continue;
        }

        // Wait for IRC registered event, and send identify info.
        transport.on('registered', function () {
            plugin.log('%s: Sending IDENTIFY to NickServ.', tpname);
            if (nsOpts.nick_first) {
                transport.say('NickServ', 'IDENTIFY', nick, nsOpts.password);
            }
            else {
                transport.say('NickServ', 'IDENTIFY', nsOpts.password, nick);
            }

            waitForIdentifySuccess.call(plugin, transport, nsOpts);
        });
    }

    // this.on('registered', function (network, msg) {
    //     var nick = this.networks[network].config.nick;
    //     var nickserv_opts = extend({}, default_opts,
    //         this.config.get('plugins.nickserv.networks.' + network, {}));
    //
    //     if (nickserv_opts.password) {
    //         this.log('%s: Received welcome message from %s. Sending IDENTIFY to NickServ...',
    //             network, msg.server);
    //         if (nickserv_opts.nick_first) {
    //             this.say(network, 'NickServ', 'IDENTIFY', nick, nickserv_opts.password);
    //         }
    //         else {
    //             this.say(network, 'NickServ', 'IDENTIFY', nickserv_opts.password, nick);
    //         }
    //
    //         // Listen for a notice event on this network.
    //         if (Array.isArray(nickserv_opts.channels) && nickserv_opts.channels.length) {
    //             waitingForNickServ[network] = true;
    //             this.once('notice', checkForIdentifySuccess);
    //         }
    //     }
    // });
};
