var extend = require('extend');

var config = require('../../bot/config');
var Plugin = require('../../bot/plugin');


var MockPlugin = module.exports = function (name) {
    this._listeners = {};

    // A default set of networks.
    this.networks = {
        network: {
            nick: 'borgil',
            channels: {
                '#channel1': {},
                '#channel2': {},
            }
        }
    };

    // A default config object.
    config.call(this, {
        admins: ['admin'],
    });

    this.buffers = {};
    this.memory = {};

    // Plugin commands for tests to spy on.
    this.say = jasmine.createSpy('say');
    this.join = jasmine.createSpy('join');
    this.part = jasmine.createSpy('part');
    this.log = jasmine.createSpy('log');
    this.error = jasmine.createSpy('error');

    require('../../plugins/' + name).call(this, this);
};

MockPlugin.prototype._addMessageListener = function(pattern, callback, opts, parseMatch) {
    var plugin = this;

    if (!callback.name) return;
    if (!opts) opts = {};

    var type = 'message';
    if (opts.ignorePrivate && opts.ignorePublic) return;
    else if (opts.ignorePrivate) type = 'message#';
    else if (opts.ignorePublic) type = 'pm';

    this._listeners[callback.name] = {
        type: type,
        pattern: pattern,
        callback: callback,
        parseMatch: parseMatch,
    };
};

MockPlugin.prototype.listen = Plugin.prototype.listen;
MockPlugin.prototype.addCommand = Plugin.prototype.addCommand;
MockPlugin.prototype.getCommandRegex = Plugin.prototype.getCommandRegex;

MockPlugin.prototype._sendMessageTo = function (listenerName, msg) {
    var listener = this._listeners[listenerName];

    // A default message object for tests to send to plugin listeners.
    var default_msg = {
        network: 'network',
        nick: 'nick',
        target: '#channel1',
        replyto: '#channel1',
        text: 'text',
    };

    listener.callback.call(this, extend(
        default_msg,
        listener.parseMatch((msg.text || default_msg.text).match(listener.pattern)),
        msg || {}
    ));
};
