var entities = require('entities');
var request = require('request');

module.exports = function (bot) {
    // fetch title for URLs and echo it into the channel
    bot.listen('message#', /https?:\/\/([^\/\s]+)\S*/i, function (msg) {
        var url = msg.match[0],
            domain = msg.match[1];

        request.get(url, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var t = body.match(/<title>(.+)<\/title>/i);
                if (!t || !t[1].length) return;
                var title = entities.decodeHTML(t[1]);
                bot.say(msg.network, msg.target, '[ ' + title + ' ] - ' + domain);
            }
        });
    });
};
