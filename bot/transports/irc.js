'use strict';

const irc = require('irc');
const util = require('util');

const Transport = require('../transport');


const defaultCommandchar = '.';

module.exports = class IRC extends Transport {
    constructor(bot, name, config) {
        super(bot, name);

        this.irc = new irc.Client(config.host, config.nick, config.opts);

        // Log a message and connect to channels manually after receiving MOTD.
        this.irc.on('motd', () => {
            bot.log.info('Got MOTD from', this.name);

            (config.channels || []).forEach((channel) => {
                const keyword = config.channel_keywords && config.channel_keywords[channel];
                this.irc.join(channel + (keyword ? ` ${keyword}` : ''));
            });
        });

        // Set up some log events.
        this.irc.conn.on('connect', () => {
            bot.log.info('Connected to', this.name);
        });
        this.irc.conn.on('end', () => {
            bot.log.info('Got END from', this.name);
        });
        this.irc.conn.on('close', () => {
            bot.log.info('Disconnected from', this.name);
        });

        // Log raw IRC messages.
        if (bot.config.get('log.debug')) {
            this.irc.on('raw', (msg) => {
                bot.log.debug('%s: <-', this.name, msg.rawCommand, msg.command.toUpperCase(),
                    msg.nick || '', msg.args);
            });
            this.irc.on('selfMessage', (target, text) => {
                bot.log.debug('%s: -> %s:', this.name, target, text);
            });
        }

        // Log IRC error events.
        this.irc.on('error', (msg) => {
            this.emit('error', `${msg.command.toUpperCase()} ${msg.args.join(', ')}`);
        });

        // Listen for IRC message events, and emit message/command events from the transport.
        this.irc.on('message', (nick, to, text) => {
            const data = {
                from: nick,
                from_name: nick,
                to,
                replyto: to === this.nick ? nick : to,
                replyto_name: to === this.nick ? nick : to,
                text,
                time: new Date(),
            };

            // If this message is a command, add command properties and emit a command event.
            const commandchar = bot.config.get('commandchar', defaultCommandchar)
                .replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            const commandRegex = new RegExp(`^${commandchar}(\\S+)(?:\\s+(.*?))?\\s*$`);
            const m = text.match(commandRegex);
            if (m) {
                Object.assign(data, {
                    command: m[1],
                    args: (m[2] || '').trim(),
                });
                this.emit('command', data);
            }

            this.emit('message', data);
        });
    }

    say(target, ...args) {
        this.irc.say(target, util.format(...args));
    }

    get channels() {
        return Object.keys(this.irc.chans);
    }
};
