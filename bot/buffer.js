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
        if (!(source in this.buffers[client.__network])) {
            this.buffers[client.__network][source] = [];
        }
        var buffer = this.buffers[client.__network][source];

        if (buffer.length >= (this.config.get('buffer') || 100)) {
            buffer.pop();
        }

        buffer.unshift({
            nick: nick,
            text: text,
            time: Date.now(),
        });
    });
};
