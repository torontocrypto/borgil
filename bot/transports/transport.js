var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');


var Transport = module.exports = function (bot, name) {
    EventEmitter.call(this);

    this.bot = bot;
    this.name = name;

    this.onAny(function () {
        if (this.event === 'error') {
            return bot.log.error('Error on %s (%s):', this.name, typeof this, arguments[0]);
        }
        // Emit events at the bot level,
        // passing the transport as the first argument and original arguments after it.
        bot.emit.apply(bot, [this.event, this].concat(arguments));
    });
};
util.inherits(Transport, EventEmitter);

// Override the emit function to pass all events to the Bot object as well.
Transport.prototype.emit = function () {
    var eventType = arguments[0],
        eventArgs = Array.prototype.slice.call(arguments, 1);

    if (eventType == 'error') {
        // Emit errors at the bot level only.
        var msg = arguments[1];
        bot.log.error('Error on client %s:', network, msg.command.toUpperCase(), msg.args);
    }
    else {
        // Emit other events at the bot level,
        // passing the transport as the first argument and original arguments after it.
        this.bot.emit.apply(bot, [eventType, this].concat(eventArgs));
        for (name in bot.plugins) {
            bot.plugins[name].emit.apply(bot.plugins[name], [eventType, network].concat(eventArgs));
        }

        // Emit the event as normal.
        EventEmitter.prototype.emit.apply(this, arguments);
    }
}
