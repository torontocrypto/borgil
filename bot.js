var connection = require('./connection');

var clients;

var bot = {
    use: function (plugin) {
        // call the plugin with this bot instance so it can add commands
        if (typeof plugin == 'function') {
            plugin(bot);
        }
        else if (typeof plugin == 'Object') {
            for (prop in plugin) {
                if (typeof prop == 'function') {
                    prop(bot);
                }
            }
        }
    },

    listen: function (pattern, callback) {
        // add listener for this pattern
        for (network in clients) {
            clients[network].addListener('message', function (nick, target, text, msg) {
                var match = text.match(pattern);
                if (match) {
                    callback(network, target, nick, text, match);
                }
            });
        }
    },

    command: function (command, callback) {
        // add listener for this string prefixed by command character
        for (network in clients) {
            clients[network].addListener('message', function (nick, target, text, msg) {
                var match = text.match('^' + config.commandchar + command + '(?:\\s+(.*))?');
                if (match) {
                    callback(network, target, nick, text, (match[1] || '').trim().split(/\s+/));
                }
            })
        }
    },

    say: function (network, target, message) {
        clients[network].say(target, message);
    }
};

module.exports = function (config) {
    clients = connection(config);
    return bot;
}
