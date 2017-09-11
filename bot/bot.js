'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;
const fs = require('fs');
const handlebars = require('handlebars');
const moment = require('moment-timezone');
const path = require('path');
const winston = require('winston');

const Config = require('./config');
const Plugin = require('./plugin');


const logDefaults = {
    dir: 'logs',
    filename_template: 'bot--{{date}}.log',
    date_format: 'YYYY-MM-DD--HH-mm-ss',
    console: false,
    debug: false,
};
const defaultBuffer = 100;

module.exports = class Bot extends EventEmitter {
    constructor(configfile) {
        super();

        this.config = new Config(configfile);

        this.memory = {};

        // Include extra functionality.
        this.initLog();
        this.initBuffers();
        this.initTransports();
        this.initPlugins();
    }

    initLog() {
        const level = this.config.get('log.debug') ? 'debug' : 'info';
        const renderFilename = handlebars.compile(
            this.config.get('log.filename_template', logDefaults.filename_template));

        const logdir = this.config.get('log.dir', logDefaults.dir);
        try {
            fs.mkdirSync(logdir);
        }
        catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }

        const dateFormat = this.config.get('log.date_format', logDefaults.dateFormat);
        const timezone = this.config.get('log.timezone');
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
        if (this.config.get('log.console')) {
            transports.push(new winston.transports.Console({
                colorize: true,
                level,
                timestamp: true,
            }));
        }

        this.log = new winston.Logger({
            transports,
        });
    }

    initBuffers() {
        // Create buffer objects for each client.
        this.buffers = {};

        // Log each message to a buffer.
        this.on('message', (transport, msg) => {
            // Initialize buffer for this transport and source if necessary.
            if (!(transport.name in this.buffers)) {
                this.buffers[transport.name] = {};
            }
            if (!(msg.replyto in this.buffers[transport.name])) {
                this.buffers[transport.name][msg.replyto] = [];
            }
            const buffer = this.buffers[transport.name][msg.replyto];

            // Trim buffer to maximum length, then add this message.
            if (buffer.length >= this.config.get('buffer', defaultBuffer)) {
                buffer.pop();
            }
            buffer.unshift(msg);
        });
    }

    // Activate all transports mentioned in the transports section of the config.
    initTransports() {
        const tpConfigs = this.config.get('transports', {});

        this.transports = {};
        Object.keys(tpConfigs).forEach((tpName) => {
            this.log.info('Activating transport:', tpName);
            const tpConfig = tpConfigs[tpName];
            let transport;
            try {
                // eslint-disable-next-line global-require
                const TpType = require(`./transports/${tpConfig.type}`);
                transport = new TpType(this, tpName, tpConfig);
            }
            catch (err) {
                this.log.warn('Error activating transport %s:', tpName, err.message);
                return;
            }
            this.transports[tpName] = transport;
        });

        this.log.info(Object.keys(this.transports).length, 'transports(s) activated.');
    }

    // Activate all plugins mentioned in the plugins section of the config.
    initPlugins() {
        this.plugins = {};
        Object.keys(this.config.get('plugins', {})).forEach((pluginName) => {
            this.log.info('Activating plugin:', pluginName);
            let plugin;
            try {
                plugin = new Plugin(this, pluginName);
            }
            catch (err) {
                this.log.warn('Error activating plugin %s:', pluginName, err.message);
                return;
            }
            this.plugins[pluginName] = plugin;
        });

        this.log.info(Object.keys(this.plugins).length, 'plugin(s) activated.');
    }
};
