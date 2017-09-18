'use strict';

const Bot = require('../../bot/bot');
const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('Search and replace plugin', () => {
    let mockBot;
    let mockTransport;

    beforeEach(() => {
        mockBot = new MockBot({plugins: {sed: {}}});
        Bot.prototype.initBuffers.call(mockBot); // Add normal buffer functionality.
        mockTransport = new MockTransport();
    });

    it('should check the buffer for messages on the same channel', () => {
        mockBot.emit('message', mockTransport, {
            from: 'somebody',
            replyto: '#channel1',
            text: 'This message is wrong!',
        });
        mockBot.emit('message', mockTransport, {
            from: 'somebody',
            replyto: '#channel1',
            text: 'Another message',
        });
        mockBot.emit('message', mockTransport, {
            from: 'somebody',
            replyto: '#channel1',
            text: 's/wrong/right/',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
            'somebody', 'meant to say:', 'This message is right!');
    });
});
