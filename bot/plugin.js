var extend = require('extend');
var util = require('util');


// A set of commands and properties for a single plugin to access.
// Instantiating one of these objects per client helps with logging and error handling.
var Plugin = module.exports = function (bot, name) {
    this.bot = bot;
    this.name = name;

    this.config = bot.config;
    this.buffers = bot.buffers;
    this.memory = bot.memory;
    this.transports = bot.transports;

    bot.log.info('Activating plugin:', name);
    require('../plugins/' + name)(this);
};


// Start listening for a message matching a pattern, and call back with data about the message.
Plugin.prototype.listen = function (pattern, callback) {
    var plugin = this;

    this.bot.on('message', function (transport, msg) {
        var match = msg.text.match(pattern);
        if (match) {
            try {
                callback(extend({
                    transport: transport,
                    match: match,
                }, msg));
            }
            catch (e) {
                plugin.error(e.message);
            }
        }
    });
};

// Start listening for a command message matching a particular set of commands.
Plugin.prototype.addCommand = function (commands, callback) {
    var plugin = this;

    if (typeof commands === 'string') {
        commands = commands.split(',');
    }

    this.bot.on('command', function (transport, msg) {
        if (commands.indexOf(msg.command) > -1) {
            try {
                callback(extend({
                    transport: transport,
                }, msg));
            }
            catch (e) {
                plugin.error(e.message);
            }
        }
    });
};


// Add a line to the log.
Plugin.prototype.log = function () {
    this.bot.log.info('%s:', this.name, util.format.apply(null, arguments));
};

// Add an error to the log.
Plugin.prototype.error = function () {
    this.bot.log.error('%s:', this.name, util.format.apply(null, arguments));
};
