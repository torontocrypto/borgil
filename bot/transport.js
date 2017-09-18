'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;


module.exports = class Transport extends EventEmitter {
    constructor(bot, name) {
        super();

        this.bot = bot;
        this.name = name;

        this.onAny((...args) => {
            if (this.event === 'error') {
                return bot.log.error('Error on %s (%s):', this.name, typeof this, args[0]);
            }

            // Emit events at the bot level,
            // passing the transport as the first argument and original arguments after it.
            bot.emit(this.event, this, ...args);
        });
    }

    // Interface methods that should be implemented by every transport.
    /* eslint-disable class-methods-use-this */
    say() {}
    connect() {}
    disconnect() {}
    join() {}
    leave() {}
};
