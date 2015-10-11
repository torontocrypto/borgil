var extend = require('extend');
var handlebars = require('handlebars');


var default_template = '[{{{source}}}] <{{{from_name}}}> {{{text}}}';

module.exports = function () {
    function broadcastToTargets(msg, targets) {
        var render_template = handlebars.compile(this.config.get('plugins.broadcast.template', default_template));

        targets.forEach(function (target) {
            // Don't send to the same target the message came from.
            if (target.transport == msg.transport.name && target.channel == msg.replyto) return;
            // Don't send to networks/channels we aren't currently in.
            if (!(target.transport in this.transports)) return;
            if (this.transports[target.transport].channels.indexOf(target.channel) === -1) return;

            // 'source' is the channel name, with transport prepended if it's not the current one.
            var data = extend({
                source: (target.transport != msg.transport.name ? (msg.transport.name + ':') : '') +
                    (msg.replyto_name || msg.replyto),
            }, msg);

            this.transports[target.transport].say(target.channel, render_template(data));
        }, this);
    }

    this.listen('.*', function (msg) {
        if (this.config.get('plugins.broadcast.broadcast_all')) {
            // Build a set of targets from all joined channels in all connected networks.
            var targets = [];
            for (var tpname in this.transports) {
                this.transports[tpname].channels.forEach(function (channel) {
                    targets.push({
                        transport: tpname,
                        channel: channel,
                    });
                });
            }
            broadcastToTargets.call(this, msg, targets);
        }
        else {
            // Iterate through the configured sets of targets that will be broadcast to each other.
            this.config.get('plugins.broadcast.target_sets', []).forEach(function (targets) {
                // Check that the received message's target is in this set.
                if (targets.some(function (target) {
                    return target.transport == msg.transport.name && target.channel == msg.replyto;
                })) {
                    broadcastToTargets.call(this, msg, targets);
                }
            }, this);
        }
    });
};
