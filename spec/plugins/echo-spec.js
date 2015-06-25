var MockPlugin = require('../helpers/mock-plugin');


describe('Echo plugin', function () {
    var mockPlugin;

    beforeEach(function () {
        mockPlugin = new MockPlugin('echo');
    });

    it('should repeat any message on the same channel', function () {
        mockPlugin._sendMessage('network1', 'somebody', '#channel1', 'message text');
        expect(mockPlugin.say).toHaveBeenCalledWith('network1', '#channel1', 'message text');
    });

    it('should repeat any private message', function () {
        mockPlugin._sendMessage('network1', 'somebody', 'borgil', 'message text');
        expect(mockPlugin.say).toHaveBeenCalledWith('network1', 'somebody', 'message text');
    });
});
