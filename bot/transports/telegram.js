'use strict';

const request = require('request');
const util = require('util');

const Transport = require('../transport');


module.exports = class Telegram extends Transport {
    constructor(bot, name, config) {
        super(bot, name);

        this.token = config.token;
        this.offset = 0;

        this._getUpdates();
    }

    _send(method, params, callback) {
        request(
            {
                uri: `https://api.telegram.org/bot${this.token}/${method}`,
                method: 'post',
                json: true,
                qs: params,
            },
            (err, res, body) => {
                if (err) {
                    return callback ? callback(err) : null;
                }
                if (!body.ok || !body.result) {
                    const err = new Error(body.description || 'Unknown API error');
                    err.status = body.error_code || 400;
                    return callback ? callback(err) : null;
                }

                if (callback) {
                    callback(null, body.result);
                }
            });
    }

    _getUpdates() {
        this.bot.log.debug('%s: Polling for Telegram updates...', this.name);

        // Make a long polling call to the API.
        this._send('getUpdates',
            {
                offset: this.offset,
                timeout: 20,
            },
            (err, result) => {
                if (err) {
                    this.emit('error', err.message);
                }
                else {
                    // Emit events for any messages received.
                    (result || []).forEach((update) => {
                        this.bot.log.debug('%s: Got update:', this.name, JSON.stringify(update));

                        this.offset = Math.max(this.offset, update.update_id + 1);

                        if (update.message) {
                            this._parseMessage(update.message);
                        }
                        if (update.channel_post) {
                            this._parseChannelPost(update.channel_post);
                        }
                    });
                }

                // Continue polling.
                this._getUpdates();
            });
    }

    _parseMessage(message) {
        const fromName = message.from.first_name +
            (message.from.last_name ? ` ${message.from.last_name}` : '');

        const data = {
            from: message.from.username || message.from.id,
            from_name: fromName,
            to: message.chat.id,
            replyto: message.chat.id,
            replyto_name: message.chat.title || fromName,
            text: message.text || '',
            time: new Date(message.date * 1000),
        };

        // If this message is a command, add command properties and emit a command event.
        // Currently this uses a slash instead of the configured command character.
        const cmd = (message.entities || [])
            .find(entity => (entity.type === 'bot_command' && entity.offset === 0));
        if (cmd) {
            data.command = message.text.slice(cmd.offset + 1, cmd.length);
            data.args = message.text.slice(cmd.offset + cmd.length).trim();
            this.emit('command', data);
        }

        this.emit('message', data);
    }

    _parseChannelPost(post) {
        // TODO: Telegram channel posts don't expose sending user, but come from the channel itself.
        // Most plugins assume a sending user, so don't emit message/command events for now.
        // Instead let's emit 'broadcast' events, but maybe remove these in the future
        // if plugins are updated to handle them as regular message events.

        const fromName = post.chat.title || post.chat.username;

        const data = {
            from: post.chat.username || post.chat.id,
            from_name: fromName,
            text: post.text || '',
            time: new Date(post.date * 1000),
        };

        // If this message is a command, add command properties and emit a command event.
        // Currently this uses a slash instead of the configured command character.
        const cmd = (post.entities || [])
            .find(entity => (entity.type === 'bot_command' && entity.offset === 0));
        if (cmd) {
            data.command = post.text.slice(cmd.offset + 1, cmd.length);
            data.args = post.text.slice(cmd.offset + cmd.length).trim();
            this.emit('broadcastcommand', data);
        }

        this.emit('broadcast', data);
    }

    say(target, ...args) {
        this._send('sendMessage', {
            chat_id: target,
            text: util.format(...args),
        });
    }

    get channels() {
        return this.bot.config.get(`transports.${this.name}.chat_ids`, []);
    }
};
