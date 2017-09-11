'use strict';

const defaultBuffer = 100;

module.exports = function initBuffers(bot) {
    // Create buffer objects for each client.
    bot.buffers = {};

    // Log each message to a buffer.
    bot.on('message', (transport, msg) => {
        // Initialize buffer for this transport and source if necessary.
        if (!(transport.name in bot.buffers)) {
            bot.buffers[transport.name] = {};
        }
        if (!(msg.replyto in bot.buffers[transport.name])) {
            bot.buffers[transport.name][msg.replyto] = [];
        }
        const buffer = bot.buffers[transport.name][msg.replyto];

        // Trim buffer to maximum length, then add this message.
        if (buffer.length >= bot.config.get('buffer', defaultBuffer)) {
            buffer.pop();
        }
        buffer.unshift(msg);
    });
};
