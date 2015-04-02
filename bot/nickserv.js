var util = require('util');


function checkForIdentifySuccess(nick, target, text, msg) {
    if (nick == 'NickServ' && target == this._config.nick && text.indexOf('You are successfully identified') > -1) {
        // join all nickserv-only channels
        this._config.nickserv_channels.forEach(function (channel) {
            this.join(channel);
        }, this);
    }
    else {
        // reassign the listener
        this.once('notice', checkForIdentifySuccess);
    }
}

module.exports = function () {
    for (network in this.clients) {
        this.clients[network].once('registered', function (msg) {
            // check if we should identify with nickserv, and send the id message if so
            if (this._config.nickserv_channels && this._config.nickserv_channels.length && this._config.nickserv_password) {
                util.log(this._network + ': Received welcome message from ' + msg.server + '. Sending IDENTIFY to NickServ...');
                this.say('NickServ', 'IDENTIFY ' + this._config.nickserv_password + ' ' + this._config.nick);
            }

            // join channels only when nickserv identification comes back
            this.once('notice', checkForIdentifySuccess);
        });
    }
};
