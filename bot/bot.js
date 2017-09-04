var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');

var Config = require('./config');
var Plugin = require('./plugin');


// The bot object.
var Bot = module.exports = function (configfile) {
    // Run the event emitter constructor.
    EventEmitter.call(this);

    this.config = new Config(configfile);

    this.plugins = {};
    this.memory = {};

    // Include extra functionality.
    require('./logger')(this);
    require('./transports')(this);
    require('./buffer')(this);

    // Activate all plugins mentioned in the plugins section of the config.
    for (pluginName in this.config.get('plugins', {})) {
        this.log.info('Activating plugin:', pluginName);
        try {
            var plugin = new Plugin(this, pluginName);
        }
        catch (err) {
            this.log.warn('Error activating plugin %s:', pluginName, err.message);
            continue;
        }
        this.plugins[pluginName] = plugin;
    }
};
// Extend the event emitter class.
util.inherits(Bot, EventEmitter);
