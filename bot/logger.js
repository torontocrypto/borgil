var fs = require('fs');
var handlebars = require('handlebars');
var moment = require('moment');
var path = require('path');
var winston = require('winston');


var log_defaults = {
    dir: 'logs',
    filename_template: 'bot--{{date}}.log',
    date_format: 'YYYY-MM-DD--HH-mm-ss',
    console: false,
    debug: false,
};


module.exports = function (bot) {
    var level = bot.config.get('log.debug') ? 'debug' : 'info';
    var render_filename = handlebars.compile(bot.config.get('log.filename_template', log_defaults.filename_template));

    var logdir = bot.config.get('log.dir', log_defaults.dir);
    try {
        fs.mkdirSync(logdir);
    }
    catch (err) {
        if (err.code != 'EEXIST') throw err;
    }
    var logfile = path.join(logdir, render_filename({
        date: moment().format(bot.config.get('log.date_format', log_defaults.date_format))
    }));

    var transports = [];
    if (logfile) {
        transports.push(new winston.transports.File({
            filename: logfile,
            json: false,
            level: level,
            timestamp: true,
        }));
    }
    if (bot.config.get('log.console')) {
        transports.push(new winston.transports.Console({
            colorize: true,
            level: level,
            timestamp: true,
        }));
    }

    bot.log = new winston.Logger({
        transports: transports
    });
};
