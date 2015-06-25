var MockPlugin = require('../helpers/mock-plugin');


describe('Echo plugin', function () {
    var mockPlugin;

    beforeEach(function () {
        mockPlugin = new MockPlugin('echo');
    });

    it('should repeat any message on the same channel', function () {
        mockPlugin._sendMessageTo('repeatMessage', {
            replyto: '#channel1',
            text: 'message text',
        });
        expect(mockPlugin.say).toHaveBeenCalledWith('network', '#channel1', 'message text');
    });

    it('should repeat any private message', function () {
        mockPlugin._sendMessageTo('repeatMessage', {
            replyto: 'somebody',
            text: 'message text',
        });
        expect(mockPlugin.say).toHaveBeenCalledWith('network', 'somebody', 'message text');
    });
});
