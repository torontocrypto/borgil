'use strict';

const fs = require('fs');
const mkdirp = require('mkdirp');
const nock = require('nock');
const path = require('path');

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('RSS feed plugin', () => {
    let mockBot;
    let irc1;
    let irc2;
    let db;

    const rssFile = fs.readFileSync(`${__dirname}/../data/feed.rss`, {encoding: 'utf8'});
    const atomFile = fs.readFileSync(`${__dirname}/../data/feed.atom`, {encoding: 'utf8'});

    beforeEach((done) => {
        mkdirp.sync(path.join(__dirname, '../temp'));

        mockBot = new MockBot({
            dbdir: path.join(__dirname, '../temp'),
            'plugins.rss.item_template': '[{{name}}] {{{title}}} | {{url}}',
        });
        irc1 = mockBot.transports.irc1 = new MockTransport('irc1');
        irc2 = mockBot.transports.irc2 = new MockTransport('irc2');

        // Set up mock responses.
        nock('http://feed.com')
            .get('/rss').reply(200, rssFile)
            .get('/atom').reply(200, atomFile);

        // Clear the database and set up spies.
        db = mockBot.plugins.rss.db;
        db.remove({}, {multi: true}, () => {
            spyOn(db, 'insert').and.callThrough();
            spyOn(db, 'find').and.callThrough();
            spyOn(db, 'remove').and.callThrough();
            done();
        });
    });

    it('should quickly fetch a feed on command', (done) => {
        mockBot.emit('command', irc1, {
            replyto: '#channel1',
            command: 'rss',
            args: 'quick http://feed.com/rss',
        });
        setTimeout(() => {
            expect(irc1.say).toHaveBeenCalledWith('#channel1',
                '[QUICK] Example entry | http://www.example.com/blog/post/1');
            done();
        }, 500);
    });

    it('should add a feed to the database on command', (done) => {
        mockBot.emit('command', irc1, {
            replyto: '#channel1',
            command: 'rss',
            args: 'add newFeed http://feed.com/rss',
        });
        setTimeout(() => {
            expect(db.insert).toHaveBeenCalledWith(jasmine.objectContaining({
                transport: 'irc1',
                target: '#channel1',
                name: 'newFeed',
                url: 'http://feed.com/rss',
            }), jasmine.any(Function));
            done();
        }, 100);
    });

    it('should remove a feed from the database on command', () => {
        mockBot.emit('command', irc1, {
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

    describe('list command', () => {
        beforeEach((done) => {
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

        it('should list all feeds in the current channel on command', (done) => {
            mockBot.emit('command', irc1, {
                replyto: '#channel1',
                command: 'rss',
                args: 'list',
            });
            setTimeout(() => {
                expect(irc1.say).toHaveBeenCalledWith('#channel1',
                    'Found %d feed%s.', 2, 's');
                expect(irc1.say).toHaveBeenCalledWith('#channel1',
                    ' irc1 #channel1 Feed #1\u000f http://feed.com/rss');
                expect(irc1.say).toHaveBeenCalledWith('#channel1',
                    ' irc1 #channel1 \u000305Feed #2\u000f http://anotherfeed.com/rss');
                done();
            }, 100);
        });
    });

    it('should fetch a feed and pass the latest item to a callback', (done) => {
        mockBot.plugins.rss.fetchLatestItem(
            {
                url: 'http://feed.com/rss',
                color: 'dark_red',
            },
            (err, item) => {
                expect(item).toEqual({
                    title: 'Example entry',
                    url: 'http://www.example.com/blog/post/1',
                });
                done();
            });
    });
});
