var EventEmitter = require('eventemitter2').EventEmitter2;
var irc = require('irc');

var MockConfig = require('../helpers/mock-config');
var IRC = require('../../bot/transports/irc');


describe('IRC transport', function () {
    var bot;
    var transport;
    var messageHandler;
    var commandHandler;

    beforeEach(function () {
        bot = new EventEmitter();
        bot.config = new MockConfig({
            'debug.log': false,
            'commandchar': '%',
        });

        transport = new IRC(bot, 'irc', {
            host: 'irc.server.com',
            nick: 'borgil',
            opts: {}
        });

        messageHandler = jasmine.createSpy();
        commandHandler = jasmine.createSpy();
        transport.on('message', messageHandler);
        transport.on('command', commandHandler);
    });

    it('should emit message events', function () {
        transport.irc.emit('message', 'nick', '#channel', 'blah blah', {});

        expect(messageHandler).toHaveBeenCalledWith(jasmine.objectContaining({
            from: 'nick',
            to: '#channel',
            replyto: '#channel',
            text: 'blah blah',
        }));
        expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should emit commands as message and command events', function () {
        transport.irc.emit('message', 'nick', '#channel', '%command arg1 arg2');

        var expectedData = jasmine.objectContaining({
            from: 'nick',
            to: '#channel',
            replyto: '#channel',
            text: '%command arg1 arg2',
            command: 'command',
            args: 'arg1 arg2',
        });

        expect(messageHandler).toHaveBeenCalledWith(expectedData);
        expect(commandHandler).toHaveBeenCalledWith(expectedData);
    });
});
