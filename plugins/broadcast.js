'use strict';

const extend = require('extend');
const handlebars = require('handlebars');


const defaultTemplate = '[{{{source}}}] <{{{from_name}}}> {{{text}}}';

module.exports = function broadcastPlugin(plugin) {
    function broadcastToTargets(msg, targets) {
        const renderTemplate = handlebars.compile(
            plugin.config.get('plugins.broadcast.template', defaultTemplate));

        targets.forEach((target) => {
            // Don't send to the same target the message came from.
            if (target.transport === msg.transport.name && target.channel === msg.replyto) {
                return;
            }
            // Don't send to networks/channels we aren't currently in.
            if (!plugin.transports[target.transport] ||
                plugin.transports[target.transport].channels.indexOf(target.channel) === -1) {
                return;
            }

            // 'source' is the channel name, with transport prepended if it's not the current one.
            const data = extend({
                source: (target.transport !== msg.transport.name ?
                    `${msg.transport.name}:` : '') + (msg.replyto_name || msg.replyto),
            }, msg);

            plugin.transports[target.transport].say(target.channel, renderTemplate(data));
        });
    }

    plugin.listen('.*', (msg) => {
        // Don't broadcast non-text messages or commands.
        if (!msg.text || msg.command) {
            return;
        }

        if (plugin.config.get('plugins.broadcast.broadcast_all')) {
            // Build a set of targets from all joined channels in all connected networks.
            // For IRC it's all joined channels. For Telegram it's the transport config's chat_ids.
            const targets = [];
            Object.keys(plugin.transports).forEach((tpName) => {
                plugin.transports[tpName].channels.forEach((channel) => {
                    targets.push({
                        transport: tpName,
                        channel,
                    });
                });
            });
            broadcastToTargets(msg, targets);
        }
        else {
            // Iterate through the configured sets of targets that will be broadcast to each other.
            plugin.config.get('plugins.broadcast.target_sets', [])
                .filter(targets => targets.some(target =>
                    (target.transport === msg.transport.name && target.channel === msg.replyto)))
                .forEach(targets => broadcastToTargets(msg, targets));
        }
    });
};
