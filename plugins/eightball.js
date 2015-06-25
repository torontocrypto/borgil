var fs = require('fs');

module.exports = function (bot) {
    var resps = [];

    var filename = bot.config.get('plugins.eightball.response_file', './plugins/data/eightball.txt');

    fs.readFile(filename, {encoding: 'UTF-8'}, function (err, data) {
        if (err) return bot.error("Couldn't find 8-ball response file.");
        resps = data.trim().split('\n');
    });

    bot.addCommand(['8', '8ball', 'eightball'], function (cmd) {
        if (!resps.length) return;
        bot.say(cmd.network, cmd.replyto, resps[Math.floor(Math.random() * resps.length)]);
    });
};
