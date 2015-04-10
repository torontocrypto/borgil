function checkForIdentifySuccess(nick, target, text, msg) {
    if (nick == 'NickServ' && target == this.__config.nick && text.indexOf('You are successfully identified') > -1) {
        // join all nickserv-only channels
        this.__config.nickserv_channels.forEach(function (channel) {
            if (channel in this.__config.nickserv_channel_keywords) {
                channel += ' ' + this.__config.nickserv_channel_keywords[channel];
            }
            this.join(channel);
        }, this);
    }
    else {
        // reassign the listener
        this.once('notice', checkForIdentifySuccess);
    }
}

module.exports = function () {
    var log = this.log;

    for (network in this.clients) {
        this.clients[network].once('registered', function (msg) {
            // check if we should identify with nickserv, and send the id message if so
            if (this.__config.nickserv_channels && this.__config.nickserv_channels.length && this.__config.nickserv_password) {
                log.info('%s: Received welcome message from %s. Sending IDENTIFY to NickServ...', this.__network, msg.server);
                this.say('NickServ', 'IDENTIFY ' + this.__config.nickserv_password + ' ' + this.__config.nick);
            }

            // join channels only when nickserv identification comes back
            this.once('notice', checkForIdentifySuccess);
        });
    }
};
