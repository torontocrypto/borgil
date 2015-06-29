var extend = require('extend');
var util = require('util');
var winston = require('winston');

var Plugin = require('../../bot/plugin');


// A mock plugin object. Differences from the real plugin object:
// - Properties set to simple defaults.
// - Action methods stubbed out with Jasmine spies.
// - _sendMessage method allows us to emit IRC message events directly.
var MockPlugin = module.exports = function (name, config) {
    this._listeners = {};

    // Default config.
    require('../../bot/config').call(this, extend({
        nick: 'borgil',
        admins: ['admin'],
    }, config));

    // Default properties.
    this._bot = {
        clients: {
            network1: {
                nick: 'borgil',
                chans: {
                    '#channel1': {},
                    '#channel2': {},
                }
            }
        }
    };
    this.buffers = {};
    this.memory = {};

    // Replace these commands with stubs.
    spyOn(this, 'say').and.callFake(function (network, target, text) {
        winston.info('%s: <%s/%s>', name, network, target, text);
    });
    spyOn(this, 'join').and.callFake(function (network, target, text) {
        winston.info('%s: <%s/%s>', name, network, target, text);
    });
    spyOn(this, 'part').and.callFake(function (network, target, text) {
        winston.info('%s: <%s/%s>', name, network, target, text);
    });
    spyOn(this, 'log');
    spyOn(this, 'error');

    require('../../plugins/' + name).call(this, this);
};

// Extend the real plugin prototype.
util.inherits(MockPlugin, Plugin);


MockPlugin.prototype._sendMessage = function (network, nick, target, text) {
    var raw = {
        prefix: 'prefix',
        nick: nick,
        user: 'user',
        host: 'host',
        server: 'server',
        rawCommand: 'PRIVMSG',
        command: 'PRIVMSG',
        commandType: 'normal',
        args: [target, text],
    };

    // Emit the IRC message event, the same as the IRC module would.
    this.emit('message', network, nick, target, text, raw);
    if ('&#+!'.indexOf(target[0]) > -1) {
        this.emit('message#', network, nick, target, text, raw);
    }
    if (target == this.config.get('nick')) {
        this.emit('pm', network, nick, text, raw);
    }
};
