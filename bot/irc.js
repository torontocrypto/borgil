var irc = require('irc');
var util = require('util');


module.exports = function () {
    // create a client instance for each network in the config
    var networks = this.config.get('networks', []);
    for (var network in networks) {
        var networkcfg = networks[network];

        // Instantiate the IRC client.
        var client = this.clients[network] = new irc.Client(networkcfg.host, networkcfg.nick, networkcfg.opts);

        // Prefix these with underscores to avoid possible future conflicts with the IRC lib.
        client.__network = network;
        client.__config = networkcfg;

        // Monkeypatch the emit function to pass all events to the Bot object as well.
        var selfEmit = client.emit,
            bot = this;

        client.emit = function () {
            var eventType = arguments[0],
                eventArgs = Array.prototype.slice.call(arguments, 1);

            if (eventType == 'error') {
                // Emit errors at the bot level only.
                var msg = arguments[1];
                bot.log.error('Error on client %s:', this.__network, msg.command.toUpperCase(), msg.args);
            }
            else {
                // Emit other events at the bot level and the plugin level,
                // passing the client as the first argument and original arguments after it.
                bot.emit.apply(bot, [eventType, this].concat(eventArgs));
                for (name in bot.plugins) {
                    bot.plugins[name].emit.apply(bot.plugins[name], [eventType, this].concat(eventArgs));
                }

                // Emit the event at the client level as normal.
                selfEmit.apply(this, arguments);
            }
        };
    }
};
