'use strict';

module.exports = function errorTestPlugin(plugin) {
    plugin.addCommand('error', () => {
        throw new Error('This is a test error.');
    });
};
