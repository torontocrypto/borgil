function checkForAdmin(nick, config) {
    var admin = false;
    var adminlist = config.get('admins');

    for (i = 0; i < adminlist.length; i++) {
        if (adminlist[i] === nick) {
            admin = true;
            break;
        }
    }

    return admin;
}

module.exports = function (bot) {
    
    bot.addCommand('join', function (cmd) {
        if (!checkForAdmin( cmd.nick, bot.config )) return bot.say(cmd.network, cmd.replyto, 'You\'re not my supervisor!');

        var chan = cmd.args[0];
        var p = cmd.args[1];

        if (!chan) return bot.say(cmd.network, cmd.replyto, 'Usage: .join <channel>');
        if (p) { chan += ' '; chan += p; }
        bot.join(cmd.network, chan);
    });

    bot.addCommand('part', function (cmd) {
        if (!checkForAdmin( cmd.nick, bot.config )) return bot.say(cmd.network, cmd.replyto, 'You\'re not my supervisor!');
    
        var partmsg = cmd.args[0] || 'I\'ll show you.';

        bot.part(cmd.network, cmd.replyto, partmsg);
    });

    bot.addCommand('disconnect', function (cmd) {
        console.log(cmd);
    });
    bot.addCommand('reconnect', function (cmd) {
    });

    bot.addCommand('getnick', function (cmd) {

    });
};
