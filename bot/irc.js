var irc = require('irc');
var util = require('util');


module.exports = function () {
    var bot = this;

    // Create a client instance for each network in the config.
    var networks = this.config.get('networks', []);
    for (var network in networks) {
        this.log.info('Connecting to %s...', network);
        var config = networks[network];

        // Instantiate the IRC client.
        var client = this.clients[network] = new irc.Client(config.host, config.nick, config.opts);
        client._name = network;

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

        // Look for bot command messages, and fire command events.
        client.on('message', function (nick, to, text, msg) {
            // Get command character, create a regex for commands, and test the message.
            var commandchar = bot.config.get('commandchar', '.')
                .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            var commandRegex = new RegExp('^' + commandchar + '(\\S+)(?:\\s+(.*?))?\\s*$');
            var m = text.match(commandRegex);
            if (m) {
                // Fire command events for the message.
                var command = m[1];
                var args = (m[2] || '').trim();
                this.emit('command', nick, to, text, command, args, msg);
                if (this.supported.channel.types.indexOf(to.charAt(0)) > -1) {
                    this.emit('command#', nick, to, text, command, args, msg);
                    this.emit('command' + to, nick, to, text, command, args, msg);
                    if (to != to.toLowerCase()) {
                        this.emit('command' + to.toLowerCase(), nick, text, command, args, msg);
                    }
                }
                if (to == this.nick) this.emit('pcommand', nick, text, command, args, msg);
            }
        });

        // Monkeypatch the emit function to pass all events to the Bot object as well.
        client.emit = function () {
            var eventType = arguments[0],
                eventArgs = Array.prototype.slice.call(arguments, 1);

            if (eventType == 'error') {
                // Emit errors at the bot level only.
                var msg = arguments[1];
                bot.log.error('Error on client %s:', this._name, msg.command.toUpperCase(), msg.args);
            }
            else {
                // Emit other events at the bot level and the plugin level,
                // passing the network name as the first argument and original arguments after it.
                bot.emit.apply(bot, [eventType, this._name].concat(eventArgs));
                for (name in bot.plugins) {
                    bot.plugins[name].emit.apply(bot.plugins[name], [eventType, this._name].concat(eventArgs));
                }

                // Emit the event at the client level as normal.
                irc.Client.prototype.emit.apply(this, arguments);
            }
        };
    }
};
