var irc = require('irc');
var util = require('util');

var Transport = require('./transport');


var IRC = module.exports = function (bot, name, config) {
    Transport.call(this, bot, name);
    var transport = this;

    this.irc = new irc.Client(config.host, config.nick, config.opts);

    // Set up some log events.
    this.irc.conn.on('connect', function () {
        bot.log.info('Connected to', transport.name);
    });
    this.irc.conn.on('end', function () {
        bot.log.info('Got END from', transport.name);
    });
    this.irc.conn.on('close', function () {
        bot.log.info('Disconnected from', transport.name);
    });

    // Log raw IRC messages.
    if (bot.config.get('log.debug')) {
        this.irc.on('raw', function (msg) {
            bot.log.debug('%s: <-', transport.name, msg.rawCommand, msg.command.toUpperCase(), msg.nick || '', msg.args);
        });
        this.irc.on('selfMessage', function (target, text) {
            bot.log.debug('%s: -> %s:', transport.name, target, text);
        });
    }

    // Log IRC error events.
    this.irc.on('error', function (msg) {
        transport.emit('error', msg.command.toUpperCase() + ' ' + msg.args.join(', '));
    });

    // Listen for IRC message events, and emit message/command events from the transport.
    this.irc.on('message', function (nick, to, text, msg) {
        var data = {
            from: nick,
            to: to,
            replyto: to == this.nick ? nick : to,
            text: text,
            time: new Date(),
        };

        // If this message is a command, add command properties and emit a command event.
        var commandchar = bot.config.get('commandchar', '.')
            .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        var commandRegex = new RegExp('^' + commandchar + '(\\S+)(?:\\s+(.*?))?\\s*$');
        var m = text.match(commandRegex);
        if (m) {
            data.command = m[1];
            data.args = (m[2] || '').trim();
            transport.emit('command', data);
        }

        transport.emit('message', data);
    });
};
util.inherits(IRC, Transport);

IRC.prototype.say = function (target) {
    var text = util.format.apply(null, Array.prototype.slice.call(arguments, 1));
    this.irc.say(target, text);
};

IRC.prototype.sendRaw = function () {
    this.irc.send.apply(this.irc, arguments);
};
