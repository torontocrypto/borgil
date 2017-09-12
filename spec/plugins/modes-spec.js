'use strict';

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('IRC modes plugin', () => {
    let mockBot; // eslint-disable-line no-unused-vars
    let mockIRC;

    beforeEach(() => {
        mockIRC = new MockTransport();
        mockIRC.irc = {
            send: jasmine.createSpy(),
        };

        mockBot = new MockBot(
            {'plugins.modes.irc': '+B'},
            {irc: mockIRC},
        );
    });

    it('should send a MODE command to an IRC transport once registered', () => {
        mockIRC.emit('registered');
        expect(mockIRC.irc.send).toHaveBeenCalledWith('MODE', '+B');
    });
});
