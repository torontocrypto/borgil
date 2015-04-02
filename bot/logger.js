var fs = require('fs');
var util = require('util');


module.exports = function () {
    if (this.config.debug) {
        this.addListener('raw', function (client, msg) {
            util.log([client._network, msg.rawCommand, msg.command, msg.args.join(', ')].join(' '));
        });
    }
};
