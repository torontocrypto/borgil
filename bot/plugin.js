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

    require('../plugins/' + name).call(this, this);
};
util.inherits(Plugin, EventEmitter);


// Add a listener for a message matching a pattern, and call back with data about the message.
function addMessageListener(pattern, callback, opts, parseMatch) {
    var plugin = this;

    if (!opts) opts = {};

    var type = 'message';
    if (opts.ignorePrivate && opts.ignorePublic) return;
    else if (opts.ignorePrivate) type = 'message#';
    else if (opts.ignorePublic) type = 'pm';

    this.on(type, function (client, nick, target, text, msg) {
        var match = text.match(pattern);
        if (match) {
            try {
                callback.call(plugin, extend(
                    {
                        network: client.__network,
                        nick: nick,
                        target: target,
                        replyto: target == client.nick ? nick : target,
                        text: text,
                    },
                    parseMatch ? parseMatch(match) : {}
                ));
            }
            catch (e) {
                plugin._bot.log.error('Error in plugin %s:', plugin.name, e.message);
            }
        }
    });
}

// Start listening for a message matching a particular string or pattern.
Plugin.prototype.listen = function (pattern, callback, opts) {
    addMessageListener.call(this, pattern, callback, opts, function (match) {
        return {
            match: match,
        };
    });
};

// Start listening for a command message matching a particular command.
Plugin.prototype.addCommand = function (commands, callback, opts) {
    addMessageListener.call(this, this.getCommandRegex(commands), callback, opts, function (match) {
        return {
            command: match[1],
            args: (match[2] || '').trim(),
        };
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
                channels: clients[network].chans,
                nick: clients[network].nick
            };
        }
        return networks;
    }
});
