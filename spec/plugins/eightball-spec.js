'use strict';

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('Magic 8-ball plugin', () => {
    let mockBot;
    let mockTransport;

    beforeEach((done) => {
        mockBot = new MockBot({plugins: {eightball: {}}});
        mockTransport = new MockTransport();

        // Allow a bit of time for the response file to be read
        setTimeout(done, 50);
    });

    it('should send a message to the channel when called', () => {
        mockBot.emit('command', mockTransport, {
            replyto: '#channel1',
            command: '8ball',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', jasmine.any(String));
    });
});
