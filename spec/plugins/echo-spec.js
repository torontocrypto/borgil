'use strict';

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('Echo plugin', () => {
    let mockBot;
    let mockTransport;

    beforeEach(() => {
        mockBot = new MockBot({plugins: {echo: {}}});
        mockTransport = new MockTransport();
    });

    it('should repeat any message on the same channel', () => {
        mockBot.emit('message', mockTransport, {
            from: 'somebody',
            to: '#channel1',
            replyto: '#channel1',
            text: 'message text',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'message text');
    });

    it('should repeat any private message', () => {
        mockBot.emit('message', mockTransport, {
            from: 'somebody',
            to: 'borgil',
            replyto: 'somebody',
            text: 'message text',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('somebody', 'message text');
    });
});
