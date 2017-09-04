// simple echo plugin for testing purposes
module.exports = function (plugin) {
    plugin.listen('.*', function (msg) {
        msg.transport.say(msg.replyto, msg.text);
    });
};
