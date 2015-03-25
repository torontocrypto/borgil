// simple echo plugin for testing purposes
module.exports = function () {
    this.listen('message', '.*', function (network, target, nick, text, match) {
        this.say(network, target == this.get_nick(network) ? nick : target, text);
    }, true);
};
