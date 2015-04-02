var EventEmitter = require('events').EventEmitter;
var irc = require('irc');
var util = require('util');


var ClientManager = module.exports = function (config) {
    this.config = config;
    this.clients = {};

    // run the event emitter constructor
    EventEmitter.call(this);

    // create a client instance for each network in the config
    for (var network in config.networks) {
        var networkcfg = config.networks[network];

        // instantiate the client
        var client = this.clients[network] = new irc.Client(networkcfg.host, networkcfg.nick, networkcfg.opts);
        client._network = network;
        client._config = networkcfg;

        // monkeypatch the emit function to pass all events to the ClientManager object as well
        var selfEmit = client.emit,
            manager = this;
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
    }

    // include extra functionality
    require('./buffer').call(this);
    require('./logger').call(this);
    require('./nickserv').call(this);
}
// extend the event emitter class
util.inherits(ClientManager, EventEmitter);
