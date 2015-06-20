var util = require('util');


var API = module.exports = function (bot, plugin_name) {
    this._bot = bot;
    this._plugin = plugin_name;

    this.config = bot.config;
    this.memory = bot.memory;

    //this.commands = [];
    this.command_listeners = {};

    require('../plugins/' + plugin_name).call(this, this);
};


// A wrapper for the plugin caller, with error handling.
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

    // Add a listener for channel or private messages.
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


// Check if a message is a command, and return a match object if it does.
API.prototype.matchCommand = function (text) {
    // Get the character/string that precedes commands and escape it for regex.
    var commandchar = this.config.get('commandchar', '.').replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    return text.match('^' + commandchar + '(\\S+)(?:\\s+(.*?))?\\s*$');
}


// Add a listener for a particular command.
API.prototype.addCommand = function (command, callback, ignorePrivate, ignorePublic) {
    var api = this;

    var type = 'message';
    if (ignorePrivate && ignorePublic) return;
    else if (ignorePrivate) type = 'message#';
    else if (ignorePublic) type = 'pm';

    if (!command) return;
//    console.log("&&");
//    console.log(command);
//    api.commands = api.commands.concat(command);
//    api.commands = [].concat(command).filter(function (cmd) {
//        return typeof cmd == 'string' && cmd;
//    });

//    console.log("**");
//    console.log(api.commands);
    
    api.command_listeners[command] = function (client, nick, target, text, msg) {
        var match = api.matchCommand(text);
        if (!match[1]) return;
        if (match && api.command_listeners[match[1]]) {
            console.log('ping');
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
    };

    this._bot.addListener(type, api.command_listeners[command]);
};


// Remove a command listener.
API.prototype.removeCommand = function (command, plugin_name) {
    var type = 'message';
    this._bot.removeListener(type, this._bot.plugins[plugin_name].command_listeners[command]);
};


// Send a message to the specified target.
API.prototype.say = function (network, target) {
    if (!this._bot.clients[network]) return;

    var text = util.format.apply(null, Array.prototype.slice.call(arguments, 2));
    this._bot.clients[network].say(target, text);
};


// Join a channel
API.prototype.join = function (network, channel) {
    if (!this._bot.clients[network]) return;

    this._bot.clients[network].join(channel);
};


// Leave a channel
API.prototype.part = function (network, channel) {
     if (!this._bot.clients[network]) return;
     
     var msg = util.format.apply(null, Array.prototype.slice.call(arguments, 2));
     this._bot.clients[network].part(channel, msg);
};


// Get whois info for a nickname
API.prototype.whois = function (network, nick, callback) {
    if (!this._bot.clients[network]) return;
    this._bot.clients[network].whois(nick, function (info) { callback(info); });
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
