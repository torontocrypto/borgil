// Callback function (admin) {}
function checkForAdmin(nick, network, bot, callback) {
    var admin = false;
    var adminlist = bot.config.get('admins');
    var registered =  false;

    bot.whois(network, nick, function (info) { 
        if (network === "oftc") {
            var oftcre = /.*\.oftc\.net$/
            registered = oftcre.test(info.host);
        }
        if (registered) {
            for (i = 0; i < adminlist.length; i++) {
                if (adminlist[i] === nick) {
                    admin = true;
                    break;
                }
            }
        }
        callback(admin);
    });
}

module.exports = function (bot) {
    bot.addCommand('join', function (cmd) {
        checkForAdmin(cmd.nick, cmd.network, bot, function (admin) {
            if (admin) {
                var chan = cmd.args[0];
                var p = cmd.args[1];

                if (!chan) return bot.say(cmd.network, cmd.replyto, 'Usage: .join <channel>');
                if (p) { chan += ' '; chan += p; }
                bot.join(cmd.network, chan);
            } else {
                bot.say(cmd.network, cmd.replyto, 'You\'re not my supervisor!');
            }
        });
    });

    bot.addCommand('part', function (cmd) {
        checkForAdmin(cmd.nick, cmd.network, bot, function (admin) {
            if (admin) {
                var partmsg = cmd.args[0] || 'I\'ll show you.';
                bot.part(cmd.network, cmd.replyto, partmsg);
            } else {
                bot.say(cmd.network, cmd.replyto, 'You\'re not my supervisor!');
            }
        });
    });
};
