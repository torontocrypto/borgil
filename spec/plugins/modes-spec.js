var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('IRC modes plugin', function () {
    var mockBot;
    var mockIRC;

    beforeEach(function () {
        mockBot = new MockBot({
            'plugins.modes': {
                irc: '+B',
            },
        });

        mockIRC = new MockTransport();
        mockIRC.sendRaw = jasmine.createSpy();
        mockBot.transports = {
            irc: mockIRC,
        };

        mockBot.use('modes');
    });

    it('should send a MODE command to an IRC transport once registered', function () {
        mockIRC.emit('registered');
        expect(mockIRC.sendRaw).toHaveBeenCalledWith('MODE', '+B');
    });
});
