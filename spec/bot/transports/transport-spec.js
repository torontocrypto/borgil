var EventEmitter = require('eventemitter2').EventEmitter2;

var Transport = require('../../../bot/transports/transport');


describe('Transport base class', function () {
    var bot;
    var transport;

    beforeEach(function () {
        bot = new EventEmitter();
        transport = new Transport(bot, 'test');
    });

    it('should pass events to the bot object', function () {
        var handler = jasmine.createSpy();
        bot.on('event', handler);

        transport.emit('event', 'arg1', 'arg2');

        expect(handler).toHaveBeenCalledWith(transport, 'arg1', 'arg2');
    });
});
