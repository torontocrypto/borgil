'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;
const winston = require('winston');

const Config = require('../../bot/config');
const Plugin = require('../../bot/plugin');


// The bot object.
module.exports = class MockBot extends EventEmitter {
    constructor(config, transports) {
        super();

        this.config = new Config(config || {});

        // Mock out extra bot functionality.
        this.memory = new Map();
        this.log = winston;
        this.transports = transports || {};
        this.buffers = {};
        this.plugins = {};

        Object.keys(this.config.get('plugins', {})).forEach((pluginName) => {
            this.plugins[pluginName] = new Plugin(this, pluginName);
        });

        winston.level = 'error';
    }
};
