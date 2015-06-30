var fs = require('fs');
var yaml = require('js-yaml');


function getValue(obj, elems) {
    if (elems.length == 1) {
        // leaf node
        return obj[elems[0]];
    }

    if (typeof obj[elems[0]] != 'object') {
        // branch doesn't exist
        return undefined;
    }

    // move down the tree
    return getValue(obj[elems[0]], elems.slice(1));
}

function setValue(obj, elems, value) {
    if (elems.length == 1) {
        obj[elems[0]] = value;
        return;
    }

    if (typeof obj[elems[0]] != 'object') {
        throw new TypeError('Tried to set a config value as a child of an existing value.');
    }

    setValue(obj[elems[0]], elems.slice(1), value);
}

module.exports = function (config_init) {
    var config = {};

    // If an object is passed, use it as the config.
    if (typeof config_init == 'object') {
        config = config_init;
    }
    // If a string is passed, treat it as a filename and read that file as YAML or JSON.
    else if (typeof config_init == 'string') {
        var configfile = fs.readFileSync(config_init, 'utf-8');

        try {
            if (config_init.match(/\.ya?ml$/i)) config = yaml.safeLoad(configfile);
            else config = JSON.parse(configfile);
        } catch (e) {
            console.log('Error reading config file at ' + config_init + ':', e.message);
        }
    }

    this.config = {
        get: function (path, defval) {
            var value = getValue(config, Array.isArray(path) ? path : path.split('.'));
            return value !== undefined ? value : defval;
        },

        set: function (path, value) {
            setValue(config, Array.isArray(path) ? path : path.split('.'), value);
        },

        save: function () {
            if (typeof config_init == 'string') {
                fs.writeFile(config_init, JSON.stringify(config, null, 4), {encoding: 'utf-8'});
            }
        }
    };
};
