var EventEmitter = require('events').EventEmitter;
var extend = require('extend');
var util = require('util');


// A set of commands and properties for a single plugin to access.
// Instantiating one of these objects per client helps with logging and error handling.
var Plugin = module.exports = function (bot, name) {
    EventEmitter.call(this);

    this._bot = bot;
    this.name = name;

    this.config = bot.config;
    this.buffers = bot.buffers;
    this.memory = bot.memory;

    bot.log.info('Activating plugin:', name);
    require('../plugins/' + name).call(this, this);
};
util.inherits(Plugin, EventEmitter);


// Start listening for a message matching a pattern, and call back with data about the message.
Plugin.prototype.listen = function (pattern, callback, opts) {
    var plugin = this;

    if (!opts) opts = {};

    var type = 'message';
    if (opts.ignorePrivate && opts.ignorePublic) return;
    else if (opts.ignorePrivate) type = 'message#';
    else if (opts.ignorePublic) type = 'pm';

    // FIXME: this won't work for private messages, as they don't include a nick argument
    this.on(type, function (network, nick, target, text, msg) {
        var match = text.match(pattern);
        if (match) {
            try {
                callback.call(plugin, {
                    network: network,
                    nick: nick,
                    target: target,
                    replyto: target == this.networks[network].nick ? nick : target,
                    text: text,
                    match: match,
                });
            }
            catch (e) {
                plugin.error(e.message);
            }
        }
    });
};

// Start listening for a command message matching a particular set of commands.
Plugin.prototype.addCommand = function (commands, callback, opts) {
    var plugin = this;

    if (typeof commands === 'string') {
        commands = commands.split(',');
    }

    this.on('command#', function (network, nick, target, text, command, args, msg) {
        if (commands.indexOf(command) > -1) {
            try {
                callback.call(plugin, {
                    network: network,
                    nick: nick,
                    target: target,
                    replyto: target == this.networks[network].nick ? nick : target,
                    text: text,
                    command: command,
                    args: args,
                });
            }
            catch (e) {
                plugin.error(e.message);
            }
        }
    });
};

// Return a regex for a command message.
// If one or more commands is specified, match those commands only; otherwise match any.
Plugin.prototype.getCommandRegex = function (commands) {
    var regex_special_chars = /[-[\]{}()*+?.,\\^$|#\s]/g;

    var commandchar = this.config.get('commandchar', '.')
        .replace(regex_special_chars, '\\$&');

    var commands = [].concat(commands)
        .filter(function (cmd) {
            return typeof cmd == 'string' && cmd;
        })
        .map(function (cmd) {
            return cmd.replace(regex_special_chars, '\\$&');
        })
        .join('|');

    return new RegExp('^' + commandchar + '(' + (commands || '\\S+') + ')(?:\\s+(.*?))?\\s*$');
}


// Send a message to the specified target.
Plugin.prototype.say = function (network, target) {
    if (!this._bot.clients[network]) return;

    // Send all arguments after network and target to the string formatter.
    var text = util.format.apply(null, Array.prototype.slice.call(arguments, 2));
    this._bot.clients[network].say(target, text);
};

// Join a channel on one of the connected networks.
Plugin.prototype.join = function (network, channel, callback) {
    if (!this._bot.clients[network] || !channel) return;
    this._bot.clients[network].join(util.isArray(channel) ? channel.join(' ') : channel, callback);
};

// Part from a connected channel.
Plugin.prototype.part = function (network, channel, message, callback) {
    if (!this._bot.clients[network] || !(channel in this._bot.clients[network].chans)) return;
    this._bot.clients[network].part(channel, message, callback);
};

// Send a raw command with any number of arguments.
Plugin.prototype.sendRaw = function (network, type) {
    if (!this._bot.clients[network]) return;

    var cmdArgs = Array.prototype.slice.call(arguments, 2);
    this._bot.log.debug('%s: ->', network, type, cmdArgs);
    this._bot.clients[network].send.apply(this._bot.clients[network], [type].concat(cmdArgs));
};


// Add a line to the log.
Plugin.prototype.log = function () {
    this._bot.log.info('%s:', this.name, util.format.apply(null, arguments));
};

// Add an error to the log.
Plugin.prototype.error = function () {
    this._bot.log.error('%s:', this.name, util.format.apply(null, arguments));
};


// Read-only information on connected networks.
Object.defineProperty(Plugin.prototype, 'networks', {
    get: function () {
        var networks = {};
        for (network in this._bot.clients) {
            networks[network] = {
                channels: this._bot.clients[network].chans,
                nick: this._bot.clients[network].nick,
                config: this.config.get('networks.' + network),
            };
        }
        return networks;
    }
});
