var cheerio = require('cheerio');
var request = require('request');

module.exports = function (bot) {
    bot.addCommand(['s', 'search'], function (network, target, nick, command, args) {
        request.get('https://duckduckgo.com/html?q=' + args, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var $ = cheerio.load(body),
                    $result = $('div#links .web-result').not('.web-result-sponsored').first().find('a.large');

                if ($result.length) {
                    var replyto = target == bot.get_nick(network) ? nick : target;
                    bot.say(network, replyto, '[ ' + $result.text() + ' ] - ' + $result.attr('href'));
                }
            }
        });
    });
};
