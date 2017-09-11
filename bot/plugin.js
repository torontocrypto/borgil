'use strict';

const extend = require('extend');
const util = require('util');


// A set of commands and properties for a single plugin to access.
// Instantiating one of these objects per client helps with logging and error handling.
module.exports = class Plugin {
    constructor(bot, name) {
        this.bot = bot;
        this.name = name;

        // eslint-disable-next-line global-require
        require(`../plugins/${name}`)(this);
    }

    get config() {
        return this.bot.config;
    }
    get buffers() {
        return this.bot.buffers;
    }
    get memory() {
        return this.bot.memory;
    }
    get transports() {
        return this.bot.transports;
    }

    // Start listening for a message matching a pattern, and call back with data about the message.
    listen(pattern, callback) {
        this.bot.on('message', (transport, msg) => {
            const match = msg.text.match(pattern);
            if (match) {
                try {
                    callback(extend({transport, match}, msg));
                }
                catch (err) {
                    this.error(err.message);
                }
            }
        });
    }

    // Start listening for a command message matching a particular set of commands.
    addCommand(commands, callback) {
        const cmds = (typeof commands === 'string') ? commands.split(',') : commands;

        this.bot.on('command', (transport, msg) => {
            if (cmds.indexOf(msg.command) > -1) {
                try {
                    callback(extend({transport}, msg));
                }
                catch (err) {
                    this.error(err.message);
                }
            }
        });
    }

    // Add a line to the log.
    log(...args) {
        this.bot.log.info('%s:', this.name, util.format(...args));
    }

    // Add a warning to the log.
    warn(...args) {
        this.bot.log.warn('%s:', this.name, util.format(...args));
    }

    // Add an error to the log.
    error(...args) {
        this.bot.log.error('%s:', this.name, util.format(...args));
    }
};
