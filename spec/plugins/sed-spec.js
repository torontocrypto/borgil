var buffer = require('../../bot/buffer');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('Search and replace plugin', function () {
    var mockBot;
    var mockTransport;

    beforeEach(function () {
        mockBot = new MockBot({plugins: {sed: {}}});
        buffer(mockBot);  // Add normal buffer functionality.
        mockTransport = new MockTransport();
    });

    it('should check the buffer for messages on the same channel', function () {
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
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'somebody meant to say: This message is right!');
    });
});
