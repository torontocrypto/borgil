module.exports = function (plugin) {
    plugin.addCommand('error', function (cmd) {
        throw new Error('This is a test error.');
    });
};
