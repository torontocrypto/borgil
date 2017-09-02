module.exports = function (plugin) {
    // TODO: Currently we can only join or part channels on the same network
    // that we send the command from. We should be able to join/part channels
    // on other connected networks as well. Example: .join oftc/#torontocrypto

    // TODO: Admins should be configured on the transport level, not the global level.

    plugin.addCommand(['join'], function (cmd) {
        if (plugin.config.get('admins').indexOf(cmd.from) == -1) return;

        var channel = cmd.args.split(/\s+/)[0];
        if (cmd.transport.channels.indexOf(channel) > -1) {
            return cmd.transport.say(cmd.replyto, "I'm already in that channel.");
        }
        cmd.transport.join(channel, function () {
            cmd.transport.say(cmd.replyto, 'Joined %s.', channel);
        });
    });

    plugin.addCommand(['part', 'leave'], function (cmd) {
        if (plugin.config.get('admins').indexOf(cmd.from) == -1) return;

        var args = cmd.args.match(/^(\S+)(?:\s+(.*))?/);
        if (!args) return;

        var channel = args[1];
        var message = args[2] || null;

        if (cmd.transport.channels.indexOf(channel) == -1) {
            return cmd.transport.say(cmd.replyto, "I'm not in that channel.");
        }
        cmd.transport.leave(channel, message, function () {
            cmd.transport.say(cmd.replyto, 'Left %s.', channel);
        });
    });

    // TODO: Connect/disconnect/reconnect networks
    // TODO: Quit
};
