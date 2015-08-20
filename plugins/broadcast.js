var extend = require('extend');
var handlebars = require('handlebars');


var default_template = '[{{{source}}}] <{{{nick}}}> {{{text}}}';

module.exports = function () {
    function broadcastToTargets(msg, targets) {
        var render_template = handlebars.compile(this.config.get('plugins.broadcast.template', default_template));

        targets.forEach(function (target) {
            // Don't send to the same target the message came from.
            if (target.network == msg.network && target.channel == msg.replyto) return;
            // Don't send to networks/channels we aren't currently in.
            if (!(target.network in this.networks)) return;
            if (!(target.channel in this.networks[target.network].channels)) return;

            var data = extend({
                source: (target.network != msg.network ? (msg.network + ':') : '') + msg.replyto,
            }, msg);

            this.say(target.network, target.channel, render_template(data));
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
