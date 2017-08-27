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
};
// Extend the event emitter class.
util.inherits(Bot, EventEmitter);

// create an api instance for a plugin
Bot.prototype.use = function (plugin_name) {
    this.plugins[plugin_name] = new Plugin(this, plugin_name);
};
