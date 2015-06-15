var winston = require('winston');


module.exports = function () {
    var level = this.config.get('debug') ? 'debug' : 'info',
        logfile = this.config.get('logfile');

    var transports = [];
    if (logfile) {
        transports.push(new winston.transports.File({
            filename: logfile,
            json: false,
            level: level,
            timestamp: true,
        }));
    }
    if (this.config.get('logconsole')) {
        transports.push(new winston.transports.Console({
            colorize: true,
            level: level,
            timestamp: true,
        }));
    }

    this.log = new winston.Logger({
        transports: transports
    });


    // log listeners

    if (level == 'debug') {
        this.addListener('raw', function (client, msg) {
            this.log.debug('%s: <-', client.__network, msg.rawCommand, msg.command.toUpperCase(), msg.nick || '', msg.args);
        });
        this.addListener('selfMessage', function (client, target, text) {
            this.log.debug('%s: -> %s:', client.__network, target, text);
        });
    }
};
