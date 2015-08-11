var irc = require('irc');
var util = require('util');

var Transport = require('./transport');


var IRC = module.exports = function (bot, name, config) {
    Transport.call(this, bot, name);
    var network = this;

    this.client = new irc.Client(config.host, config.nick, config.opts);

    // Set up some log events.
    this.client.conn.on('connect', function () {
        bot.log.info('Connected to', network.name);
    });
    this.client.conn.on('end', function () {
        bot.log.info('Got END from', network.name);
    });
    this.client.conn.on('close', function () {
        bot.log.info('Disconnected from', network.name);
    });
};
util.inherits(IRC, Transport);
