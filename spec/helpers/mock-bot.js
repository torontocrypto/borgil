var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');
var winston = require('winston');

var Bot = require('../../bot/bot');
var Config = require('../../bot/config');

// The bot object.
var MockBot = module.exports = function (config) {
    // Run the event emitter constructor.
    EventEmitter.call(this);

    this.config = new Config(config);

    this.plugins = {};
    this.memory = {};

    // Mock out extra bot functionality.
    this.log = winston;
    this.transports = {};
    this.buffer = {};

    winston.level = 'error';
};
// Extend the event emitter class.
util.inherits(MockBot, Bot);
