module.exports = function (bot) {
    bot.addCommand('error', function (cmd) {
        throw new Error('This is a test error.');
    });
};
