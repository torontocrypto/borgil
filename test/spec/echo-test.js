var echo = require('../../plugins/echo');
var MockAPI = require('../mock-api');


describe('Echo plugin', function () {
    var mockBot;

    beforeEach(function () {
        mockBot = new MockAPI();
        echo.call(mockBot);
    });

    it('should repeat any message on the same channel', function () {
        mockBot._callListener('repeatMessage', {
            replyto: '#channel',
            text: 'message text',
        });
        expect(mockBot.say).toHaveBeenCalledWith('network', '#channel', 'message text');
    });

    it('should repeat any private message', function () {
        mockBot._callListener('repeatMessage', {
            replyto: 'somebody',
            text: 'message text',
        });
        expect(mockBot.say).toHaveBeenCalledWith('network', 'somebody', 'message text');
    });
});
