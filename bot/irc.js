var irc = require('irc');
var util = require('util');


module.exports = function () {
    // create a client instance for each network in the config
    var networks = this.config.get('networks', []);
    for (var network in networks) {
        this.log.info('Connecting to %s...', network);
        create_client(this, network, networks[network]);
    }
};

function create_client(bot, network, config) {
    // Instantiate the IRC client.
    var client = bot.clients[network] = new irc.Client(config.host, config.nick, config.opts);

    // Set up some log events.
    client.conn.on('connect', function () {
        bot.log.info('Connected to', network);
    });
    client.conn.on('end', function () {
        bot.log.info('Got END from', network);
    });
    client.conn.on('close', function () {
        bot.log.info('Disconnected from', network);
    });

    // Monkeypatch the emit function to pass all events to the Bot object as well.
    var selfEmit = client.emit;

    client.emit = function () {
        var eventType = arguments[0],
            eventArgs = Array.prototype.slice.call(arguments, 1);

        if (eventType == 'error') {
            // Emit errors at the bot level only.
            var msg = arguments[1];
            bot.log.error('Error on client %s:', network, msg.command.toUpperCase(), msg.args);
        }
        else {
            // Emit other events at the bot level and the plugin level,
            // passing the network name as the first argument and original arguments after it.
            bot.emit.apply(bot, [eventType, network].concat(eventArgs));
            for (name in bot.plugins) {
                bot.plugins[name].emit.apply(bot.plugins[name], [eventType, network].concat(eventArgs));
            }

            // Emit the event at the client level as normal.
            selfEmit.apply(this, arguments);
        }
    };
}
