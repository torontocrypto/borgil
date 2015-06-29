var waitingForNickServ = {};


// Listener for NickServe notice events.
function checkForIdentifySuccess(network, nick, target, text, msg) {
    if ((waitingForNickServ[network]) &&
            nick == 'NickServ' &&
            target == this.networks[network].config.nick &&
            text.indexOf('You are successfully identified') > -1) {

        var nickserv_opts = this.config.get('plugins.nickserv.networks.' + network, {});

        // Join all NickServ-only channels on this network.
        if (Array.isArray(nickserv_opts.channels) && nickserv_opts.channels.length) {
            this.log('%s: Identified with NickServ, joining %d NickServ-only channel%s.',
                network, nickserv_opts.channels.length, nickserv_opts.channels.length == 1 ? '' : 's');
            nickserv_opts.channels.forEach(function (channel) {
                if (channel in nickserv_opts.channel_keywords) {
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
        var nickserv_opts = this.config.get('plugins.nickserv.networks.' + network, {});
        if (nickserv_opts.password) {
            this.log('%s: Received welcome message from %s. Sending IDENTIFY to NickServ...', network, msg.server);
            this.say(network, 'NickServ', 'IDENTIFY', nickserv_opts.password, nick);

            // Listen for a notice event on this network.
            if (Array.isArray(nickserv_opts.channels) && nickserv_opts.channels.length) {
                waitingForNickServ[network] = true;
                this.once('notice', checkForIdentifySuccess);
            }
        }
    });
};
