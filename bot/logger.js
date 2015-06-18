var fs = require('fs');
var handlebars = require('handlebars');
var moment = require('moment');
var path = require('path');
var winston = require('winston');


var log_defaults = {
    dir: 'logs',
    filename: 'bot--{{date}}.log',
    date_format: 'YYYY-MM-DD--HH-mm-ss',
    console: false,
    debug: false,
};


module.exports = function () {
    var level = this.config.get('log.debug') ? 'debug' : 'info';
    var render_filename = handlebars.compile(this.config.get('log.filename', log_defaults.filename));
    var logfile = path.join(this.config.get('log.dir', log_defaults.dir), render_filename({
            date: moment().format(this.config.get('log.date_format', log_defaults.date_format))
        })
    );

    var transports = [];
    if (logfile) {
        transports.push(new winston.transports.File({
            filename: logfile,
            json: false,
            level: level,
            timestamp: true,
        }));
    }
    if (this.config.get('log.console')) {
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
