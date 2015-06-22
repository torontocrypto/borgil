var extend = require('extend');


var MockAPI = module.exports = function () {
    this._listeners = {};
    this.say = jasmine.createSpy('say');
};

MockAPI.prototype.listen = function (type, pattern, callback) {
    if (callback.name) {
        this._listeners[callback.name] = {
            type: type,
            pattern: pattern,
            callback: callback,
        };
    }
};

MockAPI.prototype._callListener = function (listenerName, msg) {
    var listener = this._listeners[listenerName];
    msg = extend({
        network: 'network',
        nick: 'nick',
        target: '#channel',
        replyto: '#channel',
        text: 'text',
    }, msg || {});
    msg.match = msg.text.match(listener.pattern);

    listener.callback.call(this, msg);
};
