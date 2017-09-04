var request = require('request');
var util = require('util');

var Transport = require('./transport');


var Telegram = module.exports = function (bot, name, config) {
    Transport.call(this, bot, name);

    this.token = config.token;
    this.offset = 0;

    this._getUpdates();
};
util.inherits(Telegram, Transport);

Telegram.prototype._send = function (method, params, callback) {
    request({
        uri: 'https://api.telegram.org/bot' + this.token + '/' + method,
        method: 'post',
        json: true,
        qs: params
    }, function (err, res, body) {
        if (err) return callback ? callback(err) : null;
        if (!body.ok || !body.result) {
            var err = new Error(body.description || 'Unknown API error');
            err.status = body.error_code || 400;
            return callback ? callback(err) : null;
        }

        if (callback) callback(null, body.result);
    });
}

Telegram.prototype._getUpdates = function () {
    var transport = this;

    var debug = this.bot.config.get('log.debug');

    if (debug) {
        this.bot.log.debug('%s: Polling for Telegram updates...', this.name);
    }

    // Make a long polling call to the API.
    this._send('getUpdates', {
        offset: this.offset,
        timeout: 20
    }, function (err, result) {
        if (err) {
            transport.emit('error', err.message);
        }
        else {
            // Emit events for any messages received.
            (result || []).forEach(function (update) {
                if (debug) {
                    transport.bot.log.debug('%s: Got update:', transport.name, JSON.stringify(update));
                }

                transport.offset = Math.max(transport.offset, update.update_id + 1);

                if (update.message) {
                    transport._parseMessage(update.message);
                }
                if (update.channel_post) {
                    transport._parseChannelPost(update.channel_post);
                }
            });
        }

        // Continue polling.
        transport._getUpdates();
    });
};

Telegram.prototype._parseMessage = function (message) {
    var from_name = message.from.first_name +
        (message.from.last_name ? ' ' + message.from.last_name : '');

    var data = {
        from: message.from.username || message.from.id,
        from_name: from_name,
        to: message.chat.id,
        replyto: message.chat.id,
        replyto_name: message.chat.title || from_name,
        text: message.text || '',
        time: new Date(message.date * 1000),
    };

    // If this message is a command, add command properties and emit a command event.
    // Currently this uses a slash instead of the configured command character.
    var cmd = (message.entities || []).find(function (entity) {
        return entity.type === 'bot_command' && entity.offset === 0;
    });
    if (cmd) {
        data.command = message.text.slice(cmd.offset + 1, cmd.length);
        data.args = message.text.slice(cmd.offset + cmd.length).trim();
        this.emit('command', data);
    }

    this.emit('message', data);
};

Telegram.prototype._parseChannelPost = function (post) {
    // TODO: Telegram channel posts don't expose a sending user, but come from the channel itself.
    // Most plugins assume a sending user, so don't emit message/command events for now.
    // Instead let's emit 'broadcast' events, but maybe remove these in the future
    // if plugins are updated to handle them as regular message events.

    var from_name = post.chat.title || post.chat.username;

    var data = {
        from: post.chat.username || post.chat.id,
        from_name: from_name,
        text: post.text || '',
        time: new Date(post.date * 1000),
    };

    // If this message is a command, add command properties and emit a command event.
    // Currently this uses a slash instead of the configured command character.
    var cmd = (post.entities || []).find(function (entity) {
        return entity.type === 'bot_command' && entity.offset === 0;
    });
    if (cmd) {
        data.command = post.text.slice(cmd.offset + 1, cmd.length);
        data.args = post.text.slice(cmd.offset + cmd.length).trim();
        this.emit('broadcastcommand', data);
    }

    this.emit('broadcast', data);
};

Telegram.prototype.say = function (target) {
    var text = util.format.apply(null, Array.prototype.slice.call(arguments, 1));
    this._send('sendMessage', {
        chat_id: target,
        text: text,
    });
};

Object.defineProperty(Telegram.prototype, 'channels', {
    get: function () {
        return this.bot.config.get('transports.' + this.name + '.chat_ids', []);
    }
});
