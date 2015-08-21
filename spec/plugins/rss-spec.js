var mkdirp = require('mkdirp');
var nock = require('nock');
var path = require('path');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('RSS feed plugin', function () {
    var mockBot;
    var mockTransport;
    var db;

    beforeEach(function (done) {
        mkdirp.sync(path.join(__dirname, '../temp'));

        mockBot = new MockBot({
            dbdir: path.join(__dirname, '../temp')
        });
        mockBot.use('rss');
        mockTransport = new MockTransport();
        db = mockBot.memory.rssdb;

        spyOn(db, 'insert').and.callThrough();
        spyOn(db, 'find').and.callThrough();

        // Clear the database.
        db.remove({}, done);
    });

    it('should add a feed to the database on command', function (done) {
        mockBot.emit('command', mockTransport, {
            replyto: '#channel1',
            command: 'rss',
            args: 'add newFeed http://feed.com/rss',
        });
        setTimeout(function () {
            expect(db.insert).toHaveBeenCalledWith(jasmine.objectContaining({
                transport: 'mockTransport',
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
            transport: 'mockTransport',
            target: '#channel1',
            name: 'newFeed',
        }), jasmine.any(Function));
    });
});
