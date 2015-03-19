var EventEmitter = require('events').EventEmitter;
var irc = require('irc');
var util = require('util');


module.exports = function Bot(config) {
    var bot = this;
    bot.config = config;
    bot.clients = {};

    // run the event emitter constructor
    EventEmitter.call(bot);

    // create a client instance for each network in the config
    for (var network in config.networks) {
        var networkcfg = config.networks[network];

        // instantiate the client
        var client = bot.clients[network] = new irc.Client(networkcfg.host, networkcfg.nick, networkcfg.opts);
        client._network = network;

        // monkeypatch the emit function to pass all events to the Bot object as well
        var selfEmit = client.emit;
        client.emit = function () {
            // create an array of arguments
            var args = [];
            for (i in arguments) args.push(arguments[i]);

            // emit the event at the bot level
            // passing the client as the first argument and original arguments afterward
            bot.emit.apply(bot, [args[0], client].concat(args.slice(1)));
            // emit the event at the client level as normal
            selfEmit.apply(client, args);
        }
    }
}
// extend the event emitter class
util.inherits(Bot, EventEmitter);


Bot.prototype.use = function (plugin) {
    // call the plugin with this bot instance so it can add commands
    if (typeof plugin == 'function') {
        plugin(this);
    }
    else if (typeof plugin == 'Object') {
        for (prop in plugin) {
            if (typeof plugin[prop] == 'function') {
                plugin[prop](this);
            }
        }
    }
};


Bot.prototype.listen = function (pattern, callback) {
    // add listener for this messages containing this pattern only
    this.addListener('message', function (client, nick, target, text, msg) {
        var match = text.match(pattern);
        if (match) {
            callback.call(this, client, target, nick, text, match);
        }
    });
};


Bot.prototype.addCommand = function (command, callback) {
    // add listener for this string prefixed by command character
    this.addListener('message', function (client, nick, target, text, msg) {
        var match = text.match('^' + this.config.commandchar + command + '(?:\\s+(.*))?');
        if (match) {
            callback.call(this, client, target, nick, text, (match[1] || '').trim().split(/\s+/));
        }
    });
};
