var fs = require('fs');

module.exports = function (bot) {
    var resps = [];

    fs.readFile('./plugins/eightball.txt', encoding='UTF-8', function (err, data) {
        if (err) throw err;
        resps = data.split('\n');
        if (resps[resps.length - 1] === '') resps.pop();
    });

    bot.addCommand('8ball', function (cmd) {
        bot.say(cmd.network, cmd.replyto, resps[Math.floor(Math.random() * resps.length)]);
    });
};
