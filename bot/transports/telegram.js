var request = require('request');
var util = require('util');

var Transport = require('./transport');


var TelegramAPI = function (token) {
    this.token = token;
}

TelegramAPI.prototype.send = function (method, params, callback) {
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
};


var Telegram = module.exports = function (bot, name, config) {
    Transport.call(this, bot, name);

    this.offset = 0;
    this.telegram = new TelegramAPI(config.token);
    this.getUpdates();
};
util.inherits(Telegram, Transport);

Telegram.prototype.getUpdates = function () {
    var tp = this;

    // Make a long polling call to the API.
    this.telegram.send('getUpdates', {
        offset: this.offset,
        timeout: 20
    }, function (err, result) {
        if (err) return console.error(err);

        // Emit events for any messages received.
        (result || []).forEach(function (update) {
            tp.offset = Math.max(tp.offset, update.update_id + 1);
            tp.emit('message', update.message);
        });

        // Continue polling.
        tp.getUpdates();
    });
};
