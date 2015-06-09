var util = require('util');


var API = module.exports = function (bot, plugin_name) {
    this._bot = bot;
    this._plugin = plugin_name;

    this.config = bot.config;
    this.memory = bot.memory;

    require('../plugins/' + plugin_name).call(this, this);
};


// a wrapper for the plugin caller, with error handling
function callPlugin(api, callback, arg) {
    try {
        callback.call(api, arg);
    }
    catch (e) {
        api._bot.log.error('Error in plugin %s:', api._plugin, e.message);
    }
}


// Add a listener for a particular type of IRC message.
API.prototype.listen = function (type, pattern, callback) {
    var api = this;

    if (['message', 'message#', 'pm'].indexOf(type) > -1) {
        this._bot.addListener(type, function (client, nick, target, text, msg) {
            var match = text.match(pattern);
            if (match) {
                callPlugin(api, callback, {
                    network: client.__network,
                    nick: nick,
                    target: target,
                    replyto: target == client.nick ? nick : target,
                    text: text,
                    match: match
                });
            }
        });
    }
};


// Add a listener for a particular command.
API.prototype.addCommand = function (command, callback, ignorePrivate, ignorePublic) {
    var api = this;

    var type = 'message';
    if (ignorePrivate && ignorePublic) return;
    else if (ignorePrivate) type = 'message#';
    else if (ignorePublic) type = 'pm';

    if (!command) return;
    if (util.isArray(command)) command = command.filter(function (cmd) {
        return typeof cmd == 'string' && cmd;
    }).join('|');

    this._bot.addListener(type, function (client, nick, target, text, msg) {
        var match = text.match('^' + api._bot.config.get('commandchar') + '(' + command + ')(?:\\s+(.*?))?\\s*$');
        if (match) {
            callPlugin(api, callback, {
                network: client.__network,
                nick: nick,
                target: target,
                replyto: target == client.nick ? nick : target,
                command: match[1],
                text: match[2] || '',
                args: (match[2] || '').split(/\s+/)
            });
        }
    });
};


// Send a message to the specified target.
API.prototype.say = function (network, target) {
    if (!this._bot.clients[network]) return;

    var text = util.format.apply(null, Array.prototype.slice.call(arguments, 2));
    this._bot.clients[network].say(target, text);
};


// Add a line to the log
API.prototype.log = function () {
    this._bot.log.info('%s:', this._plugin, util.format.apply(null, arguments));
};


// Add an error to the log
API.prototype.error = function () {
    this._bot.log.error('%s:', this._plugin, util.format.apply(null, arguments));
};


// Current information on connected networks.
Object.defineProperty(API.prototype, 'networks', {
    get: function () {
        var clients = this._bot.clients;

        return Object.keys(this._bot.clients).reduce(function (networks, network) {
            networks[network] = {
                channels: clients[network].chans,
                nick: clients[network].nick
            };
            return networks;
        }, {});
    }
});

// Current channel buffers.
Object.defineProperty(API.prototype, 'buffers', {
    get: function () {
        return this._bot.buffers;
    }
});
