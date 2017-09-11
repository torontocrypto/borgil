'use strict';

const fs = require('fs');
const nock = require('nock');
const path = require('path');

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('YouTube plugin', () => {
    let mockBot;
    let mockTransport;

    const searchData = fs.readFileSync(path.join(__dirname, '../data/video-search.json'));
    const videoData = fs.readFileSync(path.join(__dirname, '../data/video.json'));

    beforeEach(() => {
        mockBot = new MockBot({
            'plugins.youtube': {
                api_key: 'abcdefg',
                timezone: 'America/Toronto',
            },
        });
        mockTransport = new MockTransport();
    });

    it('should grab YouTube URLs and return video info', (done) => {
        const scope = nock('https://www.googleapis.com')
            .get('/youtube/v3/videos')
            .query({
                part: 'id,snippet,contentDetails,statistics',
                id: '123456789',
                key: 'abcdefg',
            })
            .reply(200, videoData);

        mockBot.emit('message', mockTransport, {
            replyto: '#channel',
            text: 'Some text https://youtube.com/watch?v=123456789 some more text',
        });

        setTimeout(() => {
            expect(scope.isDone()).toBeTruthy();
            expect(mockTransport.say).toHaveBeenCalledWith('#channel',
                '[YouTube] Video Title | Length: 3:33 | Channel: AYouTubeChannel | ' +
                'Uploaded: 2013-10-06 | Views: 1016 | +7 -1 | Comments: 1');
            done();
        }, 50);
    });

    it('should search for YouTube videos on command', (done) => {
        const scope = nock('https://www.googleapis.com')
            .get('/youtube/v3/search')
            .query({
                part: 'id',
                q: 'search phrase',
                type: 'video',
                maxResults: '1',
                key: 'abcdefg',
            })
            .reply(200, searchData)
            .get('/youtube/v3/videos')
            .query({
                part: 'id,snippet,contentDetails,statistics',
                id: '123456789',
                key: 'abcdefg',
            })
            .reply(200, videoData);

        mockBot.emit('command', mockTransport, {
            replyto: '#channel',
            command: 'yt',
            args: 'search phrase',
        });

        setTimeout(() => {
            expect(scope.isDone()).toBeTruthy();
            expect(mockTransport.say).toHaveBeenCalledWith('#channel',
                '[YouTube] Video Title | https://www.youtube.com/watch?v=123456789 | ' +
                'Length: 3:33 | Channel: AYouTubeChannel | Uploaded: 2013-10-06 | ' +
                'Views: 1016 | +7 -1 | Comments: 1');
            done();
        }, 50);
    });
});
