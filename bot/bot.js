var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');

var Plugin = require('./plugin');


// The bot object.
var Bot = module.exports = function (configfile) {
    // Run the event emitter constructor.
    EventEmitter.call(this);

    this.clients = {};
    this.plugins = {};
    this.memory = {};

    // Include extra functionality.
    require('./config').call(this, configfile);
    require('./logger').call(this);
    require('./buffer').call(this);

    var tptypes = {
        IRC: require('./transports/irc'),
        Telegram: require('./transports/telegram'),
    };
    var tpconfigs = this.config.get('transports', {});

    this.transports = {};
    for (tpname in tpconfigs) {
        var tpconfig = tpconfigs[tpname];
        if (tpconfig.type in tptypes) {
            this.transports[tpname] = new tptypes[tpconfig.type](this, tpname, tpconfig);
        }
    }
};
// Extend the event emitter class.
util.inherits(Bot, EventEmitter);

// create an api instance for a plugin
Bot.prototype.use = function (plugin_name) {
    this.plugins[plugin_name] = new Plugin(this, plugin_name);
};
