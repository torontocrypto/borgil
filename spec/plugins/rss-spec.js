var fs = require('fs');
var mkdirp = require('mkdirp');
var nock = require('nock');
var path = require('path');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('RSS feed plugin', function () {
    var mockBot;
    var mockTransport;
    var db;

    var rssFile = fs.readFileSync(__dirname + '/../data/feed.rss', {encoding: 'utf8'});
    var atomFile = fs.readFileSync(__dirname + '/../data/feed.atom', {encoding: 'utf8'});

    beforeEach(function (done) {
        mkdirp.sync(path.join(__dirname, '../temp'));

        mockBot = new MockBot({
            dbdir: path.join(__dirname, '../temp'),
            'plugins.rss.item_template': '[{{name}}] {{{title}}} | {{url}}'
        });
        mockBot.use('rss');
        mockBot.transports['irc1'] = mockTransport = new MockTransport('irc1');
        mockBot.transports['irc2'] = mockTransport2 = new MockTransport('irc2');

        // Set up mock responses.
        nock('http://feed.com')
            .get('/rss').reply(200, rssFile)
            .get('/atom').reply(200, atomFile);

        // Clear the database and set up spies.
        db = mockBot.plugins.rss.db;
        db.remove({}, {multi: true}, function () {
            spyOn(db, 'insert').and.callThrough();
            spyOn(db, 'find').and.callThrough();
            spyOn(db, 'remove').and.callThrough();
            done();
        });
    });

    it('should quickly fetch a feed on command', function (done) {
        mockBot.emit('command', mockTransport, {
            replyto: '#channel1',
            command: 'rss',
            args: 'quick http://feed.com/rss',
        });
        setTimeout(function () {
            expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                '[QUICK] Example entry | http://www.example.com/blog/post/1');
            done();
        }, 500);
    });

    it('should add a feed to the database on command', function (done) {
        mockBot.emit('command', mockTransport, {
            replyto: '#channel1',
            command: 'rss',
            args: 'add newFeed http://feed.com/rss',
        });
        setTimeout(function () {
            expect(db.insert).toHaveBeenCalledWith(jasmine.objectContaining({
                transport: 'irc1',
                target: '#channel1',
                name: 'newFeed',
                url: 'http://feed.com/rss',
            }), jasmine.any(Function));
            done();
        }, 100);
    });

    it('should remove a feed from the database on command', function () {
        mockBot.emit('command', mockTransport, {
            replyto: '#channel1',
            command: 'rss',
            args: 'del newFeed',
        });
        expect(db.remove).toHaveBeenCalledWith(jasmine.objectContaining({
            transport: 'irc1',
            target: '#channel1',
            name: 'newFeed',
        }), jasmine.any(Function));
    });

    describe('list command', function () {
        beforeEach(function (done) {
            db.insert([
                {
                    transport: 'irc1',
                    target: '#channel1',
                    name: 'Feed #1',
                    url: 'http://feed.com/rss',
                },
                {
                    transport: 'irc1',
                    target: '#channel1',
                    name: 'Feed #2',
                    url: 'http://anotherfeed.com/rss',
                    color: 'dark_red',
                },
                {
                    transport: 'irc1',
                    target: '#channel2',
                    name: 'Feed #3',
                    url: 'http://differentchannel.com/rss',
                },
                {
                    transport: 'irc2',
                    target: '#channelX',
                    name: 'Feed #4',
                    url: 'http://newtransport.com/rss',
                },
            ], done);
        });

        it('should list all feeds in the current channel on command', function (done) {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'rss',
                args: 'list',
            });
            setTimeout(function () {
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                    'Found %d feed%s.', 2, 's');
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                    ' irc1 #channel1 Feed #1\u000f http://feed.com/rss');
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                    ' irc1 #channel1 \u000305Feed #2\u000f http://anotherfeed.com/rss');
                done();
            }, 100);
        });
    });

    it('should fetch a feed and pass the latest item to a callback', function (done) {
        mockBot.plugins.rss.fetchLatestItem({
            url: 'http://feed.com/rss',
            color: 'dark_red',
        }, function (err, item) {
            expect(item).toEqual({
                title: 'Example entry',
                url: 'http://www.example.com/blog/post/1',
            });
            done();
        });
    });
});
