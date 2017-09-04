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

                var from_name = update.message.from.username || (update.message.from.first_name +
                    (update.message.from.last_name ? ' ' + update.message.from.last_name : ''));

                var data = {
                    from: update.message.from.id,
                    from_name: from_name,
                    to: update.message.chat.id,
                    replyto: update.message.chat.id,
                    replyto_name: update.message.chat.title || from_name,
                    text: update.message.text,
                    time: new Date(update.message.date * 1000),
                };

                // If this message is a command, add command properties and emit a command event.
                // Currently this uses a slash instead of the configured command character.
                var m = update.message.text.match(/^\/(\S+)(?:\s+(.*?))?\s*$/);
                if (m) {
                    data.command = m[1];
                    data.args = (m[2] || '').trim();
                    transport.emit('command', data);
                }

                transport.emit('message', data);
            });
        }

        // Continue polling.
        transport._getUpdates();
    });
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
