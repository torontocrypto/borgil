var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');

var MockConfig = require('./mock-config');
var Plugin = require('../../bot/plugin');


// A mock plugin object. Differences from the real plugin object:
// - Properties set to dummy objects.
// - Action methods stubbed out with Jasmine spies.
// - _sendMessage method allows us to emit IRC message events directly.
var MockPlugin = module.exports = function (name, config) {
    this.bot = new EventEmitter();

    this.config = new MockConfig(config);
    this.buffers = {};
    this.memory = {};

    spyOn(this, 'log');
    spyOn(this, 'error');

    require('../../plugins/' + name).call(this, this);
};
util.inherits(MockPlugin, Plugin);
