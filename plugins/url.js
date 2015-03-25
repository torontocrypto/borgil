var request = require('request');

module.exports = function (bot) {
    // fetch title for URLs and echo it into the channel
    bot.listen('message#', /https?:\/\/([^\/\s]+)\S*/i, function (network, target, nick, text, match) {
        var url = match[0];
        var domain = match[1];
        request.get(url, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var t = body.match(/<title>(.+)<\/title>/i);
                if (!t || !t[1].length) return;
                var title = t[1];
                bot.say(network, target, '[ ' + title + ' ] - ' + domain);
            }
        });
    });
};
