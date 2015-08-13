var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('Echo plugin', function () {
    var mockBot;
    var mockTransport;

    beforeEach(function () {
        mockBot = new MockBot();
        mockBot.use('echo');
        mockTransport = new MockTransport();
    });

    it('should repeat any message on the same channel', function () {
        mockBot.emit('message', mockTransport, {
            from: 'somebody',
            to: '#channel1',
            replyto: '#channel1',
            text: 'message text',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'message text');
    });

    it('should repeat any private message', function () {
        mockBot.emit('message', mockTransport, {
            from: 'somebody',
            to: 'borgil',
            replyto: 'somebody',
            text: 'message text',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('somebody', 'message text');
    });
});
