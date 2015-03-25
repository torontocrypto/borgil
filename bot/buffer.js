module.exports.updateChannelBuffer = function (client, nick, target, text, msg) {
    if (!(target in this.buffers[client._network])) {
        this.buffers[client._network][target] = [];
    }
    var buffer = this.buffers[client._network][target];

    if (buffer.length >= (this.config.buffer || 100)) {
        buffer.pop();
    }

    buffer.unshift({
        nick: nick,
        text: text,
        time: Date.now(),
    });
};
