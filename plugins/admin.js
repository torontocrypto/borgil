'use strict';

module.exports = function adminPlugin(plugin) {
    // TODO: Currently we can only join or part channels on the same network
    // that we send the command from. We should be able to join/part channels
    // on other connected networks as well. Example: .join oftc/#torontocrypto

    // TODO: Admins should be configured on the transport level, not the global level.

    plugin.addCommand(['join'], (cmd) => {
        if (plugin.config.get('admins').indexOf(cmd.from) === -1) {
            return;
        }

        const channel = cmd.args.split(/\s+/)[0];
        if (cmd.transport.channels.indexOf(channel) > -1) {
            return cmd.transport.say(cmd.replyto, "I'm already in that channel.");
        }
        cmd.transport.join(channel, () => {
            cmd.transport.say(cmd.replyto, 'Joined %s.', channel);
        });
    });

    plugin.addCommand(['part', 'leave'], (cmd) => {
        if (plugin.config.get('admins').indexOf(cmd.from) === -1) {
            return;
        }

        const args = cmd.args.match(/^(\S+)(?:\s+(.*))?/);
        if (!args) {
            return;
        }

        const channel = args[1];
        const message = args[2] || null;

        if (cmd.transport.channels.indexOf(channel) === -1) {
            return cmd.transport.say(cmd.replyto, "I'm not in that channel.");
        }
        cmd.transport.leave(channel, message, () => {
            cmd.transport.say(cmd.replyto, 'Left %s.', channel);
        });
    });

    // TODO: Connect/disconnect/reconnect networks
    // TODO: Quit
};
