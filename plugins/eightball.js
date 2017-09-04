var fs = require('fs');

module.exports = function (plugin) {
    var filename = plugin.config.get('plugins.eightball.response_file', './plugins/data/eightball.txt');

    fs.readFile(filename, {encoding: 'UTF-8'}, function (err, data) {
        if (err) return plugin.error("Couldn't find 8-ball response file.");

        var data = (data || '').trim();
        if (!data) return plugin.error('No 8-ball responses found.');

        var resps = data.split('\n');
        plugin.addCommand(['8', '8ball', 'eightball'], function (cmd) {
            cmd.transport.say(cmd.replyto, resps[Math.floor(Math.random() * resps.length)]);
        });
    });
};
