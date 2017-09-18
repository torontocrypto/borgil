'use strict';

const fs = require('fs');

module.exports = function eightballPlugin(plugin) {
    const filename = plugin.config.get('plugins.eightball.response_file',
        './plugins/data/eightball.txt');

    fs.readFile(filename, {encoding: 'UTF-8'}, (err, data) => {
        if (err) {
            return plugin.error("Couldn't find 8-ball response file.");
        }

        const trimData = (data || '').trim();
        if (!trimData) {
            return plugin.error('No 8-ball responses found.');
        }

        const resps = trimData.split('\n');
        plugin.addCommand(['8', '8ball', 'eightball'], (cmd) => {
            cmd.transport.say(cmd.replyto, resps[Math.floor(Math.random() * resps.length)]);
        });
    });
};
