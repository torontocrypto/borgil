var fs = require('fs');
var nock = require('nock');
var path = require('path');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('YouTube plugin', function () {
    var mockBot;
    var mockTransport;

    var searchData = fs.readFileSync(path.join(__dirname, '../data/video-search.json'));
    var videoData = fs.readFileSync(path.join(__dirname, '../data/video.json'));

    beforeEach(function () {
        mockBot = new MockBot({
            'plugins.youtube': {
                api_key: 'abcdefg',
                timezone: 'America/Toronto'
            }
        });
        mockBot.use('youtube');
        mockTransport = new MockTransport();
    });

    it('should grab YouTube URLs and return video info', function (done) {
        var scope = nock('https://www.googleapis.com')
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

        setTimeout(function () {
            expect(scope.isDone()).toBeTruthy();
            expect(mockTransport.say).toHaveBeenCalledWith('#channel', '[YouTube] Video Title | Length: 3:33 | Channel: AYouTubeChannel | Uploaded: 2013-10-06 | Views: 1016 | +7 -1 | Comments: 1');
            done();
        }, 50);
    });

    it('should search for YouTube videos on command', function (done) {
        var scope = nock('https://www.googleapis.com')
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

        setTimeout(function () {
            expect(scope.isDone()).toBeTruthy();
            expect(mockTransport.say).toHaveBeenCalledWith('#channel', '[YouTube] Video Title | https://www.youtube.com/watch?v=123456789 | Length: 3:33 | Channel: AYouTubeChannel | Uploaded: 2013-10-06 | Views: 1016 | +7 -1 | Comments: 1');
            done();
        }, 50);
    });
});
