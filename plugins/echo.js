'use strict';

// simple echo plugin for testing purposes
module.exports = function echoPlugin(plugin) {
    plugin.listen('.*', (msg) => {
        msg.transport.say(msg.replyto, msg.text);
    });
};
