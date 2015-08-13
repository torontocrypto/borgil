// simple echo plugin for testing purposes
module.exports = function () {
    this.listen('.*', function (msg) {
        msg.transport.say(msg.replyto, msg.text);
    });
};
