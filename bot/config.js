var extend = require('extend');
var fs = require('fs');
var yaml = require('js-yaml');


function getValue(obj, elems) {
    if (elems.length == 1) {
        // Leaf node.
        return obj[elems[0]];
    }

    if (typeof obj[elems[0]] != 'object') {
        // Branch doesn't exist.
        return undefined;
    }

    // Move down the tree.
    return getValue(obj[elems[0]], elems.slice(1));
}

function splitPath(key, value) {
    value = splitValue(value);

    // If the key is a dotted path, split off the first element and parse the rest.
    var tree = {};
    var kelem = Array.isArray(key) ? key : key.split('.');
    tree[kelem[0]] = kelem.length == 1 ? value : splitPath(kelem.slice(1), value);
    return tree;
}

function splitValue(value) {
    if (Array.isArray(value)) {
        // Parse each value individually.
        return value.map(splitValue);
    }
    if (typeof value === 'object') {
        // Parse each key and value individually.
        var tree = {};
        for (key in value) {
            extend(true, tree, splitPath(key, value[key]));
        }
        return tree;
    }
    return value;
}

var Config = module.exports = function (config_init) {
    this.config = {};

    if (typeof config_init == 'object') {
        // If an object is passed, use it as the config.
        this.config = splitValue(config_init);
    }
    else {
        // Otherwise treat it as a filename and read that file as YAML or JSON.
        // Fall back to default filenames if no existing filename was passed.
        var configpath = [config_init, 'config.json', 'config.yml'].find(fs.existsSync.bind(fs));
        if (!configpath) {
            return console.error('Config file not found.');
        }

        var configfile = fs.readFileSync(configpath, 'utf-8');

        try {
            if (configpath.match(/\.ya?ml$/i)) this.config = splitValue(yaml.safeLoad(configfile));
            else this.config = splitValue(JSON.parse(configfile));
        } catch (e) {
            console.error('Error reading config file at ' + configpath + ':', e.message);
        }
    }
};

Config.prototype.get = function (path, defval) {
    var value = getValue(this.config, Array.isArray(path) ? path : path.split('.'));
    return value !== undefined ? value : defval;
};

Config.prototype.set = function (path, value) {
    //setValue(this.config, path, value);
    extend(true, this.config, splitPath(path, value));
};

Config.prototype.save = function () {
    if (typeof config_init == 'string') {
        fs.writeFile(config_init, JSON.stringify(this.config, null, 4), {encoding: 'utf-8'});
    }
};
