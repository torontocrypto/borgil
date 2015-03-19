var EventEmitter = require('events').EventEmitter;
var irc = require('irc');
var util = require('util');


var ClientManager = module.exports = function (config) {
    var manager = this;
    manager.config = config;
    manager.clients = {};

    // run the event emitter constructor
    EventEmitter.call(manager);

    // create a client instance for each network in the config
    for (var network in config.networks) {
        var networkcfg = config.networks[network];

        // instantiate the client
        var client = manager.clients[network] = new irc.Client(networkcfg.host, networkcfg.nick, networkcfg.opts);
        client._network = network;
        client._config = networkcfg;

        // monkeypatch the emit function to pass all events to the ClientManager object as well
        var selfEmit = client.emit;
        client.emit = function () {
            // create an array of arguments
            var args = [];
            for (i in arguments) args.push(arguments[i]);

            // emit the event at the manager level
            // passing the client as the first argument and original arguments afterward
            manager.emit.apply(manager, [args[0], client].concat(args.slice(1)));
            // emit the event at the client level as normal
            selfEmit.apply(client, args);
        }

        // call nickserv and join channels
        client.once('registered', identifyAndJoin);
    }

    // echo all received messages for debugging
    if (config.debug) {
        manager.addListener('raw', function (client, msg) {
            console.log(client._network, msg.rawCommand, msg.command, ':', msg.args.join(', '));
        });
    }
}
// extend the event emitter class
util.inherits(ClientManager, EventEmitter);


function joinAllChannels() {
    this.config.channels.forEach(function (channel) {
        this.join(channel);
    });
}


// identify with nickserv, optionally wait for confirmation, then join channels
function identifyAndJoin(msg) {
    if (this._config.nickserv) {
        console.log(this._network + ': Received welcome message from ' + msg.server + '. Sending IDENTIFY to NickServ...');
        this.say('NickServ', 'IDENTIFY ' + this._config.nickserv + ' ' + this._config.nick);
    }

    if (this._config.requireNickServ) {
        // join channels only when nickserv identification comes back
        this.once('notice', function (nick, to, text, msg) {
            if (nick == 'NickServ' && to == this._config.nick && text.indexOf('You are successfully identified') > -1) {
                joinAllChannels.call(this);
            }
        });
    }
    else joinAllChannels.call(this);
}
