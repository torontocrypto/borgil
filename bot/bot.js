var util = require('util');

var ClientManager = require('./manager');


var bot;
var manager;


// this is an API for bot plugins
var Bot = module.exports = function (config) {
    bot = this;
    bot.config = config;
    manager = new ClientManager(config);
};


Bot.prototype.use = function (plugin) {
    if (typeof plugin == 'function') {
        plugin.call(bot, bot);
    }
    else if (typeof plugin == 'Object') {
        for (p in plugin) {
            if (typeof plugin[p] == 'function') {
                plugin[p].call(bot, bot);
            }
        }
    }
};


Bot.prototype.get_networks = function () {
    return Object.keys(manager.clients);
};


Bot.prototype.get_channels = function (network) {
    return Object.keys(manager.clients[network].chans);
};


Bot.prototype.get_nick = function (network) {
    return manager.clients[network].nick;
};


Bot.prototype.get_buffer = function (network, target) {
    return manager.buffers[network][target];
};


Bot.prototype.listen = function (type, pattern, callback) {
    manager.addListener(type, function (client, nick, target, text, msg) {
        var match = text.match(pattern);
        if (match) {
            callback.call(bot, client._network, target, nick, text, match);
        }
    });
};


Bot.prototype.addCommand = function (command, callback, ignorePrivate, ignorePublic) {
    var type = 'message';
    if (ignorePrivate && ignorePublic) return;
    else if (ignorePrivate) type = 'message#';
    else if (ignorePublic) type = 'pm';

    if (!command) return;
    if (util.isArray(command)) command = command.filter(function (cmd) {
        return typeof cmd == 'string' && cmd;
    }).join('|');

    manager.addListener(type, function (client, nick, target, text, msg) {
        var match = text.match('^' + bot.config.commandchar + '(' + command + ')(?:\\s+(.*?))?\\s*$');
        if (match) {
            callback.call(bot, client._network, target, nick, match[1], match[2] || '');
        }
    });
};


Bot.prototype.say = function (network, target, text) {
    manager.clients[network].say(target, text);
};
