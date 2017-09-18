var extend = require('extend');
var handlebars = require('handlebars');


var default_template = '[{{{source}}}] <{{{from_name}}}> {{{text}}}';

module.exports = function (plugin) {
    function broadcastToTargets(msg, targets) {
        var render_template = handlebars.compile(plugin.config.get('plugins.broadcast.template', default_template));

        targets.forEach(function (target) {
            // Don't send to the same target the message came from.
            if (target.transport == msg.transport.name && target.channel == msg.replyto) return;
            // Don't send to networks/channels we aren't currently in.
            if (!(target.transport in plugin.transports)) return;
            if (plugin.transports[target.transport].channels.indexOf(target.channel) === -1) return;

            // 'source' is the channel name, with transport prepended if it's not the current one.
            var data = extend({
                source: (target.transport != msg.transport.name ? (msg.transport.name + ':') : '') +
                    (msg.replyto_name || msg.replyto),
            }, msg);

            plugin.transports[target.transport].say(target.channel, render_template(data));
        });
    }

    plugin.listen('.*', function (msg) {
        // Don't broadcast non-text messages.
        if (!msg.text) {
            return;
        }

        if (plugin.config.get('plugins.broadcast.broadcast_all')) {
            // Build a set of targets from all joined channels in all connected networks.
            // For IRC it's all joined channels. For Telegram it's the transport config's chat_ids.
            var targets = [];
            for (var tpname in plugin.transports) {
                plugin.transports[tpname].channels.forEach(function (channel) {
                    targets.push({
                        transport: tpname,
                        channel: channel,
                    });
                });
            }
            broadcastToTargets(msg, targets);
        }
        else {
            // Iterate through the configured sets of targets that will be broadcast to each other.
            plugin.config.get('plugins.broadcast.target_sets', []).forEach(function (targets) {
                // Check that the received message's target is in this set.
                if (targets.some(function (target) {
                    return target.transport == msg.transport.name && target.channel == msg.replyto;
                })) {
                    broadcastToTargets(msg, targets);
                }
            });
        }
    });
};
