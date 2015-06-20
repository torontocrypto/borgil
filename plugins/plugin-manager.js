module.exports = function (bot) {
    bot.addCommand('plugin', function (cmd) {
        var usage = "Usage: .plugin {load | unload | reload} <NAME>";

        if (!(cmd.args[0] && cmd.args[1])) {
            bot.say(cmd.network, cmd.replyto, usage);
            return;
        }

        switch (cmd.args[0]) {
            case 'unload':
                bot._bot.unlinkPlugin(cmd.args[1]);
                break;
            case 'load':
                bot._bot.use(cmd.args[1]);
                break;
            case 'reload':
                bot._bot.unlinkPlugin(cmd.args[1]);
                bot._bot.use(cmd.args[1]);
                break;
            default:
                bot.say(cmd.network, cmd.replyto, usage);
        }
    });
};
