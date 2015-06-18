module.exports = function (bot) {
    function broadcastToTargets(msg, targets) {
        targets.forEach(function (target) {
            if (target.network == msg.network && target.channel == msg.replyto) return;

            var identifier = (network != msg.network ? (msg.network + ':') : '') + msg.replyto;
            bot.say(target.network, target.channel, '<%s> [%s]', identifier, msg.nick, msg.text);
        });
    }

    bot.listen('message#', '.*', function (msg) {
        if (bot.config.get('plugins.broadcast.broadcast_all')) {
            // build a set of targets from all joined channels in all connected networks
            var targets = [];
            for (network in bot.networks) {
                for (channel in bot.networks[network].channels) {
                    targets.push({
                        network: network,
                        channel: channel,
                    });
                }
            }
            broadcastToTargets(msg, targets);
        }
        else {
            // iterate through the configured sets of targets that will be broadcast to each other
            bot.config.get('plugins.broadcast.target_sets', []).forEach(function (targets) {
                // check that the received message's target is in this set
                if (targets.some(function (target) {
                    return target.network == msg.network && target.channel == msg.replyto;
                })) {
                    broadcastToTargets(msg, targets);
                }
            });
        }
    });
};
