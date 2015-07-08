module.exports = function () {
    function broadcastToTargets(msg, targets) {
        targets.forEach(function (target) {
            // Don't send to the same target the message came from.
            if (target.network == msg.network && target.channel == msg.replyto) return;
            // Don't send to channels we aren't currently in.
            if (!(target.channel in this.networks[target.network].channels)) return;

            var identifier = (target.network != msg.network ? (msg.network + ':') : '') + msg.replyto;
            this.say(target.network, target.channel, '<%s> [%s]', identifier, msg.nick, msg.text);
        }, this);
    }

    this.listen('.*', function (msg) {
        if (this.config.get('plugins.broadcast.broadcast_all')) {
            // Build a set of targets from all joined channels in all connected networks.
            var targets = [];
            for (var network in this.networks) {
                for (var channel in this.networks[network].channels) {
                    targets.push({
                        network: network,
                        channel: channel,
                    });
                }
            }
            broadcastToTargets.call(this, msg, targets);
        }
        else {
            // Iterate through the configured sets of targets that will be broadcast to each other.
            this.config.get('plugins.broadcast.target_sets', []).forEach(function (targets) {
                // Check that the received message's target is in this set.
                if (targets.some(function (target) {
                    return target.network == msg.network && target.channel == msg.replyto;
                })) {
                    broadcastToTargets.call(this, msg, targets);
                }
            }, this);
        }
    });
};
