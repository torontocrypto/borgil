var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');


var Transport = module.exports = function (bot, name) {
    EventEmitter.call(this);

    this.bot = bot;
    this.name = name;

    this.onAny(function () {
        var args = Array.prototype.slice.call(arguments);

        if (this.event === 'error') {
            return bot.log.error('Error on %s (%s):', this.name, typeof this, args[0]);
        }

        // Emit events at the bot level,
        // passing the transport as the first argument and original arguments after it.
        bot.emit.apply(bot, [this.event, this].concat(args));
    });
};
util.inherits(Transport, EventEmitter);

// Interface methods that should be implemented
Transport.prototype.say = function () {};
Transport.prototype.connect = function () {};
Transport.prototype.disconnect = function () {};
Transport.prototype.join = function () {};
Transport.prototype.leave = function () {};
