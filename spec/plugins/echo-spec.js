var MockPlugin = require('../helpers/mock-plugin');
var MockTransport = require('../helpers/mock-transport');


describe('Echo plugin', function () {
    var mockPlugin;
    var mockTransport;

    beforeEach(function () {
        mockPlugin = new MockPlugin('echo');
        mockTransport = new MockTransport();
    });

    it('should repeat any message on the same channel', function () {
        mockPlugin.bot.emit('message', mockTransport, {
            from: 'somebody',
            to: '#channel1',
            replyto: '#channel1',
            text: 'message text',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'message text');
    });

    it('should repeat any private message', function () {
        mockPlugin.bot.emit('message', mockTransport, {
            from: 'somebody',
            to: 'borgil',
            replyto: 'somebody',
            text: 'message text',
        });
        expect(mockTransport.say).toHaveBeenCalledWith('somebody', 'message text');
    });
});
