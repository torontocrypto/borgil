var EventEmitter = require('events').EventEmitter;
var irc = require('irc');
var util = require('util');

var buffer = require('./buffer');
var nickserv = require('./nickserv');


var ClientManager = module.exports = function (config) {
    var manager = this;
    manager.config = config;
    manager.clients = {};
    manager.buffers = {};

    // run the event emitter constructor
    EventEmitter.call(manager);

    // create a client instance for each network in the config
    for (var network in config.networks) {
        var networkcfg = config.networks[network];

        // instantiate the client
        var client = manager.clients[network] = new irc.Client(networkcfg.host, networkcfg.nick, networkcfg.opts);
        client._network = network;
        client._config = networkcfg;

        // create buffer object for this network
        manager.buffers[network] = {};

        // monkeypatch the emit function to pass all events to the ClientManager object as well
        var selfEmit = client.emit;
        client.emit = function () {
            // create an array of arguments
            var args = [];
            for (i in arguments) args.push(arguments[i]);

            // emit the event at the manager level
            // passing the client as the first argument and original arguments afterward
            manager.emit.apply(manager, [args[0], this].concat(args.slice(1)));
            // emit the event at the client level as normal
            selfEmit.apply(this, args);
        }

        // call nickserv and join nickserv-only channels
        client.once('registered', nickserv.identifyAndJoin);
    }

    // echo all received messages for debugging
    if (config.debug) {
        manager.addListener('raw', function (client, msg) {
            console.log(client._network, msg.rawCommand, msg.command, ((msg.nick || '') + ':'), msg.args.join(', '));
        });
    }

    manager.addListener('message', buffer.updateChannelBuffer);
}
// extend the event emitter class
util.inherits(ClientManager, EventEmitter);
