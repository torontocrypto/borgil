'use strict';

const nock = require('nock');

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('URL plugin', () => {
    let mockBot;
    let mockTransport;

    beforeEach(() => {
        mockBot = new MockBot({plugins: {url: {}}});
        mockTransport = new MockTransport();
    });

    it('should parse urls and echo them to the same channel', (done) => {
        nock('https://website.com')
            .get('/page?query=1')
            .reply(200, '<html><head><title>Page Title</title></head><body>Body</body></html>');

        mockBot.emit('message', mockTransport, {
            replyto: '#channel',
            text: 'Some text https://website.com/page?query=1 some more text',
        });

        setTimeout(() => {
            expect(mockTransport.say).toHaveBeenCalledWith('#channel',
                '[ Page Title ] - website.com');
            done();
        }, 50);
    });
});
