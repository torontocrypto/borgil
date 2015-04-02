module.exports = function () {
    // create buffer objects for each client
    this.buffers = {};
    for (network in this.clients) {
        this.buffers[network] = {};
    }

    // log each message to a buffer
    this.addListener('message', function (client, nick, target, text, msg) {
        var source = target == client.nick ? nick : target;

        // initialize buffer for this source if necessary
        if (!(source in this.buffers[client._network])) {
            this.buffers[client._network][source] = [];
        }
        var buffer = this.buffers[client._network][source];

        if (buffer.length >= (this.config.buffer || 100)) {
            buffer.pop();
        }

        buffer.unshift({
            nick: nick,
            text: text,
            time: Date.now(),
        });
    });
};
