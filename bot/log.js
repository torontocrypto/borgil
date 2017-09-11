'use strict';

const fs = require('fs');
const handlebars = require('handlebars');
const moment = require('moment-timezone');
const path = require('path');
const winston = require('winston');


const logDefaults = {
    dir: 'logs',
    filename_template: 'bot--{{date}}.log',
    date_format: 'YYYY-MM-DD--HH-mm-ss',
    console: false,
    debug: false,
};

module.exports = function initLog(bot) {
    const level = bot.config.get('log.debug') ? 'debug' : 'info';
    const renderFilename = handlebars.compile(
        bot.config.get('log.filename_template', logDefaults.filename_template));

    const logdir = bot.config.get('log.dir', logDefaults.dir);
    try {
        fs.mkdirSync(logdir);
    }
    catch (err) {
        if (err.code !== 'EEXIST') throw err;
    }

    const dateFormat = bot.config.get('log.date_format', logDefaults.dateFormat);
    const timezone = bot.config.get('log.timezone');
    const logfile = path.join(logdir, renderFilename({
        date: (timezone ? moment.tz(timezone) : moment()).format(dateFormat),
    }));

    const transports = [];
    if (logfile) {
        transports.push(new winston.transports.File({
            filename: logfile,
            json: false,
            level,
            timestamp: true,
        }));
    }
    if (bot.config.get('log.console')) {
        transports.push(new winston.transports.Console({
            colorize: true,
            level,
            timestamp: true,
        }));
    }

    bot.log = new winston.Logger({
        transports,
    });
};
