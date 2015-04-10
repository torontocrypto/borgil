var irc = require('irc');
var util = require('util');


module.exports = function () {
    // create a client instance for each network in the config
    for (var network in this.config.networks) {
        var networkcfg = this.config.networks[network];

        // instantiate the client
        var client = this.clients[network] = new irc.Client(networkcfg.host, networkcfg.nick, networkcfg.opts);
        // prefix these with two underscores because they extend the third-party client object
        // and we want to avoid possible future conflicts
        client.__network = network;
        client.__config = networkcfg;

        // monkeypatch the emit function to pass all events to the Bot object as well
        var selfEmit = client.emit,
        bot = this;
        client.emit = function () {
            var eventType = arguments[0];

            if (eventType == 'error') {
                // emit errors at the bot level only
                var msg = arguments[1];
                bot.log.error('Error on client %s: %s', this.__network, msg.command.toUpperCase(), msg.args);
            }
            else {
                // emit the event at the bot level
                // passing the client as the first argument and original arguments afterward
                bot.emit.apply(bot, [eventType, this].concat(Array.prototype.slice.call(arguments, 1)));

                // emit the event at the client level as normal
                selfEmit.apply(this, arguments);
            }
        }
    }
};
