module.exports = function (bot) {
    // TODO: Currently we can only join or part channels on the same network
    // that we send the command from. We should be able to join/part channels
    // on other connected networks as well.

    bot.addCommand(['join'], function (cmd) {
        if (bot.config.get('admins').indexOf(cmd.nick) == -1) return;

        var channel = cmd.args.match(/^[&#+!][^\s,:]+/);
        if (!channel) {
            return bot.say(cmd.network, cmd.replyto, "That isn't a valid channel.");
        }
        if (channel[0] in bot.networks[cmd.network].channels) {
            return bot.say(cmd.network, cmd.replyto, "I'm already in that channel.");
        }
        bot.join(cmd.network, channel[0], function () {
            bot.say(cmd.network, cmd.replyto, 'Joined.');
        });
    });

    bot.addCommand(['part'], function (cmd) {
        if (bot.config.get('admins').indexOf(cmd.nick) == -1) return;

        var args = cmd.args.match(/^([&#+!][^\s,:]+)(?:\s+(.*))?/);
        if (!args) {
            return bot.say(cmd.network, cmd.replyto, "That isn't a valid channel.");
        }
        if (!(args[1] in bot.networks[cmd.network].channels)) {
            return bot.say(cmd.network, cmd.replyto, "I'm not in that channel.");
        }
        else bot.part(cmd.network, args[1], args[2] || null, function () {
            bot.say(cmd.network, cmd.replyto, 'Parted.');
        });
    });

    // TODO: Connect/disconnect/reconnect networks
    // TODO: Quit
};
