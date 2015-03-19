var irc = require('irc');


module.exports = function (config) {
    var clients = {};

    // escape command character for use in regex
    config.commandchar = (config.commandchar || '.').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');

    for (var network in config.networks) {
        var networkcfg = config.networks[network];
        console.log(network + ': Connecting to ' + networkcfg.host + '...');

        // instantiate and store irc client for this network
        var client = clients[network] = new irc.Client(networkcfg.host, networkcfg.nick, networkcfg.opts);
        client.network = network;
        client.config = networkcfg;

        // echo all received messages for debugging
        if (config.debug) {
            client.addListener('raw', function (msg) {
                console.log(this.network, msg.rawCommand, msg.command, ':', msg.args.join(', '));
            });
        }

        // call nickserv and join channels
        client.once('registered', identifyAndJoin);
    }
    return clients;
};


function joinAllChannels() {
    this.config.channels.forEach(function (channel) {
        this.join(channel);
    });
}


// identify with nickserv, optionally wait for confirmation, then join channels
function identifyAndJoin() {
    if (this.config.nickserv) {
        console.log(this.network + ': Received welcome message from', msg.server + '. Sending IDENTIFY to NickServ...');
        this.say('NickServ', 'IDENTIFY ' + this.config.nickserv + ' ' + this.config.nick);
    }

    if (this.config.requireNickServ) {
        // join channels only when nickserv identification comes back
        this.once('notice', function (nick, to, text, msg) {
            if (nick == 'NickServ' && to == this.config.nick && text.indexOf('You are successfully identified') > -1) {
                joinAllChannels.call(this);
            }
        });
    }
    else joinAllChannels.call(this);
}
