'use strict';

const extend = require('extend');
const fs = require('fs');
const yaml = require('js-yaml');


function getValue(obj, elems) {
    const value = obj[elems[0]];

    if (elems.length === 1) {
        // Leaf node.
        return value;
    }

    if (!value || typeof value !== 'object') {
        // Branch doesn't exist.
        return undefined;
    }

    // Move down the tree.
    return getValue(value, elems.slice(1));
}

module.exports = class Config {
    constructor(configInit) {
        this.config = {};

        if (typeof configInit === 'object') {
            // If an object is passed, use it as the config.
            this.config = Config.splitValue(configInit);
        }
        else {
            // Otherwise treat it as a filename and read that file as YAML or JSON.
            // Fall back to default filenames if no existing filename was passed.
            const configPath = [configInit, 'config.json', 'config.yml']
                .find(fs.existsSync.bind(fs));
            if (!configPath) {
                return console.error('Config file not found.');
            }

            const configFile = fs.readFileSync(configPath, 'utf-8');

            try {
                if (configPath.match(/\.ya?ml$/i)) {
                    this.config = Config.splitValue(yaml.safeLoad(configFile));
                }
                else {
                    this.config = Config.splitValue(JSON.parse(configFile));
                }
            }
            catch (err) {
                console.error(`Error reading config file at ${configPath}:`, err.message);
            }
        }
    }

    static splitPath(key, value) {
        const val = Config.splitValue(value);

        // If the key is a dotted path, split off the first element and parse the rest.
        const tree = {};
        const kelem = Array.isArray(key) ? key : key.split('.');
        tree[kelem[0]] = kelem.length === 1 ? val : Config.splitPath(kelem.slice(1), val);
        return tree;
    }

    static splitValue(value) {
        if (Array.isArray(value)) {
            // Parse each value individually.
            return value.map(Config.splitValue);
        }

        if (value && typeof value === 'object') {
            // Parse each key and value individually.
            const tree = {};
            Object.keys(value).forEach((key) => {
                extend(true, tree, Config.splitPath(key, value[key]));
            });
            return tree;
        }

        return value;
    }

    get(path, defval) {
        const value = getValue(this.config, Array.isArray(path) ? path : path.split('.'));
        return (value === undefined || value === null) ? defval : value;
    }

    set(path, value) {
        extend(true, this.config, Config.splitPath(path, value));
    }
};
