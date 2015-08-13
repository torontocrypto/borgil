var nock = require('nock');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('URL plugin', function () {
    var mockBot;
    var mockTransport;

    beforeEach(function () {
        mockBot = new MockBot({
            'plugins.url.template': '[ {{{title}}} ] - {{domain}}',
        });
        mockBot.use('url');
        mockTransport = new MockTransport();
    });

    it('should parse urls and echo them to the same channel', function (done) {
        nock('https://website.com')
            .get('/page?query=1')
            .reply(200, '<html><head><title>Page Title</title></head><body>Body</body></html>');

        mockBot.emit('message', mockTransport, {
            replyto: '#channel',
            text: 'Some text https://website.com/page?query=1 some more text',
        });

        setTimeout(function () {
            expect(mockTransport.say).toHaveBeenCalledWith('#channel', '[ Page Title ] - website.com');
            done();
        }, 50);
    });
});
