var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');
var winston = require('winston');

var Bot = require('../../bot/bot');
var Config = require('../../bot/config');
var Plugin = require('../../bot/plugin');


// The bot object.
var MockBot = module.exports = function (config, transports) {
    // Run the event emitter constructor.
    EventEmitter.call(this);

    this.config = new Config(config || {});

    this.plugins = {};
    this.memory = {};

    // Mock out extra bot functionality.
    this.log = winston;
    this.transports = transports || {};
    this.buffers = {};

    winston.level = 'error';

    for (pluginName in this.config.get('plugins', {})) {
        this.plugins[pluginName] = new Plugin(this, pluginName);
    }
};
// Extend the event emitter class.
util.inherits(MockBot, Bot);
