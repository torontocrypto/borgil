'use strict';

const fs = require('fs');
const nock = require('nock');
const path = require('path');

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('DuckDuckGo scraper plugin', () => {
    let mockBot;
    let mockTransport;

    const searchPage = fs.readFileSync(path.join(__dirname, '../data/ddg.html'));

    beforeEach(() => {
        mockBot = new MockBot({plugins: {'ddg-scraper': {}}});
        mockTransport = new MockTransport();
    });

    it('should fetch and parse the first item from a DuckDuckGo results page', (done) => {
        nock('https://duckduckgo.com')
            .get('/html?q=Betelgeuse')
            .reply(200, searchPage);

        mockBot.emit('command', mockTransport, {
            replyto: '#channel1',
            command: 'ddg',
            args: 'Betelgeuse',
        });

        setTimeout(() => {
            expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                '[DDG] Betelgeuse - Wikipedia, the free encyclopedia | ' +
                'https://en.wikipedia.org/wiki/Betelgeuse');
            done();
        }, 50);
    });
});
