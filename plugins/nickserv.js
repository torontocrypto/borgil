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
function checkForIdentifySuccess(network, nick, target, text, msg) {
    var nickserv_opts = extend({}, default_opts, this.config.get('plugins.nickserv.networks.' + network, {}));

    if ((waitingForNickServ[network]) &&
            nick == 'NickServ' &&
            text.match(nickserv_opts.success)) {

        // Change our nick if it is currently not correct.
        if (target != this.networks[network].config.nick) {
            this.log('Nick is currently %s, requesting change to %s.',
                target, this.networks[network].config.nick);
            this.sendRaw(network, 'NICK', this.networks[network].config.nick);
        }

        // Join all NickServ-only channels on this network.
        if (Array.isArray(nickserv_opts.channels) && nickserv_opts.channels.length) {
            this.log('%s: Identified with NickServ, joining %d NickServ-only channel%s.',
                network, nickserv_opts.channels.length, nickserv_opts.channels.length == 1 ? '' : 's');
            nickserv_opts.channels.forEach(function (channel) {
                if (channel in (nickserv_opts.channel_keywords || {})) {
                    channel += ' ' + nickserv_opts.channel_keywords[channel];
                }
                this.join(network, channel);
            }, this);
        }

        delete waitingForNickServ[network];
    }
    else {
        // Not the message we are waiting for, so reassign the listener.
        this.once('notice', checkForIdentifySuccess);
    }
}


module.exports = function () {
    this.on('registered', function (network, msg) {
        var nick = this.networks[network].config.nick;
        var nickserv_opts = extend({}, default_opts, this.config.get('plugins.nickserv.networks.' + network, {}));
        if (nickserv_opts.password) {
            this.log('%s: Received welcome message from %s. Sending IDENTIFY to NickServ...', network, msg.server);
            if (nickserv_opts.nick_first) {
                this.say(network, 'NickServ', 'IDENTIFY', nick, nickserv_opts.password);
            }
            else {
                this.say(network, 'NickServ', 'IDENTIFY', nickserv_opts.password, nick);
            }

            // Listen for a notice event on this network.
            if (Array.isArray(nickserv_opts.channels) && nickserv_opts.channels.length) {
                waitingForNickServ[network] = true;
                this.once('notice', checkForIdentifySuccess);
            }
        }
    });
};
