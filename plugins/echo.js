// simple echo plugin for testing purposes
module.exports = function () {
    this.listen('.*', function (msg) {
        this.say(msg.network, msg.replyto, msg.text);
    });
};
