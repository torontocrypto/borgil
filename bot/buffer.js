var default_buffer = 100;

module.exports = function (bot) {
    // Create buffer objects for each client.
    bot.buffers = {};

    // Log each message to a buffer.
    bot.on('message', function (transport, msg) {
        // Initialize buffer for this transport and source if necessary.
        if (!(transport.name in bot.buffers)) {
            bot.buffers[transport.name] = {};
        }
        if (!(msg.replyto in bot.buffers[transport.name])) {
            bot.buffers[transport.name][msg.replyto] = [];
        }
        var buffer = bot.buffers[transport.name][msg.replyto];

        // Trim buffer to maximum length, then add this message.
        if (buffer.length >= bot.config.get('buffer', default_buffer)) {
            buffer.pop();
        }
        buffer.unshift(msg);
    });
};
