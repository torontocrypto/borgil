var EventEmitter = require('events').EventEmitter;
var util = require('util');

var API = require('./api');


var Bot = module.exports = function (configfile) {
    this.clients = {};
    this.plugins = {};
//    this.command_listeners = {};
    this.memory = {};

    // run the event emitter constructor
    EventEmitter.call(this);

    // include extra functionality
    require('./config').call(this, configfile);
    require('./logger').call(this);
    require('./irc').call(this);
    require('./buffer').call(this);
    require('./nickserv').call(this);
};

// extend the event emitter class
util.inherits(Bot, EventEmitter);

// create an api instance for a plugin
Bot.prototype.use = function (plugin_name) {
    this.plugins[plugin_name] = new API(this, plugin_name);
};

// cut a plugin from the herd, leave it for dead
Bot.prototype.unlinkPlugin = function (plugin_name) {
    if (this.plugins[plugin_name]) {
        // get list of commands in plugin
        // then remove their listeners
        var i;
        for (i = 0; i < this.plugins[plugin_name].commands.length; i++) {
            var cmd = this.plugins[plugin_name].commands[i];
            this.plugins[plugin_name].removeCommand(cmd, plugin_name);
        }

        this.plugins[plugin_name] = null;
    }
};
