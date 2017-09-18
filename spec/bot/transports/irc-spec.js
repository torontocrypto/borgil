'use strict';

const IRC = require('../../../bot/transports/irc');
const MockBot = require('../../helpers/mock-bot');


describe('IRC transport', () => {
    let bot;
    let transport;
    let messageHandler;
    let commandHandler;

    beforeEach(() => {
        bot = new MockBot({
            'debug.log': false,
            commandchar: '%',
        });

        transport = new IRC(bot, 'irc', {
            host: 'irc.server.com',
            nick: 'borgil',
            opts: {},
        });

        messageHandler = jasmine.createSpy();
        commandHandler = jasmine.createSpy();
        transport.on('message', messageHandler);
        transport.on('command', commandHandler);
    });

    it('should emit message events', () => {
        transport.irc.emit('message', 'nick', '#channel', 'blah blah', {});

        expect(messageHandler).toHaveBeenCalledWith(jasmine.objectContaining({
            from: 'nick',
            to: '#channel',
            replyto: '#channel',
            text: 'blah blah',
        }));
        expect(commandHandler).not.toHaveBeenCalled();
    });

    it('should emit commands as message and command events', () => {
        transport.irc.emit('message', 'nick', '#channel', '%command arg1 arg2');

        const expectedData = jasmine.objectContaining({
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
