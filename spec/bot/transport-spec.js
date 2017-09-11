'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;

const Transport = require('../../bot/transport');


describe('Transport base class', () => {
    let bot;
    let transport;

    beforeEach(() => {
        bot = new EventEmitter();
        transport = new Transport(bot, 'test');
    });

    it('should pass events to the bot object', () => {
        const handler = jasmine.createSpy();
        bot.on('event', handler);

        transport.emit('event', 'arg1', 'arg2');

        expect(handler).toHaveBeenCalledWith(transport, 'arg1', 'arg2');
    });
});
