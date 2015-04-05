var winston = require('winston');


module.exports = function () {
    var level = this.config.debug ? 'debug' : 'info';

    var transports = [];
    if (this.config.logfile) {
        transports.push(new winston.transports.File({
            filename: this.config.logfile,
            json: false,
            level: level,
            timestamp: true,
        }));
    }
    if (this.config.logconsole) {
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

    if (this.config.debug) {
        this.addListener('raw', function (client, msg) {
            this.log.debug('%s: <-', client.__network, msg.rawCommand, msg.command.toUpperCase(), msg.nick || '', msg.args);
        });
    }

    this.addListener('error', function (err) {
        this.log.error(err);
    });
};
