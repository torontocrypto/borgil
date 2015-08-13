var default_buffer = 100;

module.exports = function () {
    // Create buffer objects for each client.
    this.buffers = {};
    for (tpname in this.transports) {
        this.buffers[tpname] = {};
    }

    // Log each message to a buffer.
    this.on('message', function (transport, msg) {
        // Initialize buffer for this source if necessary.
        if (!(msg.replyto in this.buffers[transport.name])) {
            this.buffers[transport.name][msg.replyto] = [];
        }
        var buffer = this.buffers[transport.name][msg.replyto];

        // Trim buffer to maximum length, then add this message.
        if (buffer.length >= this.config.get('buffer', default_buffer)) {
            buffer.pop();
        }
        buffer.unshift({
            nick: msg.nick,
            text: msg.text,
            time: Date.now(),
        });
    });
};
