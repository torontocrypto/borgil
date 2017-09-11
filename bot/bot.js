'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;

const Config = require('./config');
const Plugin = require('./plugin');


module.exports = class Bot extends EventEmitter {
    constructor(configfile) {
        super();

        this.config = new Config(configfile);

        this.plugins = {};
        this.memory = {};

        // Include extra functionality.
        require('./log')(this);
        require('./transports')(this);
        require('./buffers')(this);

        // Activate all plugins mentioned in the plugins section of the config.
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
    }
};
