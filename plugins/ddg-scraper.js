var cheerio = require('cheerio');
var request = require('request');

module.exports = function (bot) {
    bot.addCommand(['s', 'search'], function (cmd) {
        request.get('https://duckduckgo.com/html?q=' + cmd.text, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var $ = cheerio.load(body),
                    $result = $('div#links .web-result').not('.web-result-sponsored').first().find('a.large');

                if ($result.length) {
                    bot.say(cmd.network, cmd.replyto, '[ ' + $result.text() + ' ] - ' + $result.attr('href'));
                }
            }
        });
    });
};
