var irc = require('irc');

var config = require('./config');

var clients = {};
var channels = [];

var debug = 0;


for (var id in config.networks) {
    var network = config.networks[id];

    // create client
    client = clients[id] = new irc.Client(network.host, network.nick, network.opts);
    client.id = id;
    client.config = network;

    // debug: echo all messages received from server
    if (debug) {
        client.addListener('raw', function (msg) {
            console.log(this.id, msg.rawCommand, msg.command, ':', msg.args.join(', '));
        });
    }

    // call nickserv when first registering on network
    client.addListener('registered', function (msg) {
        console.log(this.id, ': Received welcome message from ', msg.server);

        // identify with nickserv
        console.log('Sending message to NickServ: IDENTIFY ' + this.config.nickserv + ' ' + this.config.nick);
        this.say('NickServ', 'IDENTIFY ' + this.config.nickserv + ' ' + this.config.nick);
    });

    // once nickserv confirmation comes back, join channels
    client.addListener('notice', function (nick, to, text, msg) {
        if (nick == 'NickServ' && to == this.config.nick && text.indexOf('You are successfully identified') > -1) {
            // identified with nickserv - time to join channels
            this.config.channels.forEach(function (channel) {
                this.join(channel);
            }, this);
        }
    });

    // keep track of channels joined
    client.addListener('join', function (channel, nick, msg) {
        // make sure it's the bot that just joined
        if (nick == this.nick) {
            console.log(this.id + ': Joined channel ' + channel);
            channels.push({
                network: this.id,
                name: channel
            });
        }
    });

    client.addListener('message#', function (nick, to, text, msg) {
        // make sure the message is coming from one of the bot's channels
        channels.forEach(function (channel) {
            if (channel.network == this.id && channel.name == to) {
                // broadcast to all other channels
                channels.forEach(function (channel) {
                    if (channel.network != this.id || channel.name != to) {
                        clients[channel.network].say(channel.name, '<' + this.id + '> [' + nick + ']', text);
                    }
                });
            }
        });
    });
}
