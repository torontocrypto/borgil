var fs = require('fs');
var nock = require('nock');
var path = require('path');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('DuckDuckGo scraper plugin', function () {
    var mockBot;
    var mockTransport;

    var searchPage = fs.readFileSync(path.join(__dirname, '../data/ddg.html'));

    beforeEach(function () {
        mockBot = new MockBot({plugins: {'ddg-scraper': {}}});
        mockTransport = new MockTransport();
    });

    it('should fetch and parse the first item from a DuckDuckGo results page', function (done) {
        nock('https://duckduckgo.com')
            .get('/html?q=Betelgeuse')
            .reply(200, searchPage);

        mockBot.emit('command', mockTransport, {
            replyto: '#channel1',
            command: 'ddg',
            args: 'Betelgeuse',
        });

        setTimeout(function () {
            expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                '[DDG] Betelgeuse - Wikipedia, the free encyclopedia | https://en.wikipedia.org/wiki/Betelgeuse');
            done();
        }, 50);
    });
});
