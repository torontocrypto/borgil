var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var buffer = require('../../bot/buffer.js');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('Quote plugin', function () {
    var mockBot;
    var mockTransport;
    var db;

    beforeEach(function (done) {
        mkdirp.sync(path.join(__dirname, '../temp'));

        mockBot = new MockBot({
            dbdir: path.join(__dirname, '../temp')
        });
        buffer.call(mockBot);  // Add normal buffer functionality.
        mockBot.use('quote');
        mockTransport = new MockTransport();

        // Clear the database and set up spies.
        db = mockBot.plugins.quote.db;
        db.remove({}, {multi: true}, done);
        spyOn(db, 'insert').and.callThrough();
        spyOn(db, 'find').and.callThrough();
    });

    describe('commands', function () {
        beforeEach(function () {
            mockBot.emit('message', mockTransport, {
                from: 'somebody',
                replyto: '#channel1',
                text: 'first message',
            });
            mockBot.emit('message', mockTransport, {
                from: 'somebody',
                replyto: '#channel1',
                text: 'second message',
            });
            mockBot.emit('message', mockTransport, {
                from: 'somebodyelse',
                replyto: '#channel1',
                text: 'third message',
            });
        });

        it('should remember the most recent message if no user is specified', function (done) {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: ''
            });
            expect(db.insert).toHaveBeenCalledWith(jasmine.objectContaining({
                transport: 'mockTransport',
                from: 'somebodyelse',
                replyto: '#channel1',
                text: 'third message',
            }), jasmine.any(Function));
            setTimeout(function () {
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Remembered somebodyelse saying "third message".');
                done();
            }, 50);
        });

        it('should filter messages by user if specified', function (done) {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: 'somebody',
            });
            expect(db.insert).toHaveBeenCalledWith(jasmine.objectContaining({
                transport: 'mockTransport',
                from: 'somebody',
                replyto: '#channel1',
                text: 'second message',
            }), jasmine.any(Function));
            setTimeout(function () {
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Remembered somebody saying "second message".');
                done();
            }, 50);
        });

        it('should filter messages by a word if specified', function (done) {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: 'somebody first',
            });
            expect(db.insert).toHaveBeenCalledWith(jasmine.objectContaining({
                transport: 'mockTransport',
                from: 'somebody',
                replyto: '#channel1',
                text: 'first message',
            }), jasmine.any(Function));
            setTimeout(function () {
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Remembered somebody saying "first message".');
                done();
            }, 50);
        });

        it('should reply when a user is not found in the buffer', function () {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: 'someguy',
            });
            expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Sorry, I can\'t remember anything someguy said recently.');
        });

        it('should reply when a word is not found in the buffer', function () {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: 'someguy someword',
            });
            expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Sorry, I can\'t remember what someguy said about "someword" recently.');
        });

        describe('quote retrieval', function () {
            beforeEach(function () {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'remember',
                    args: 'somebody first',
                });
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'somebody',
                });
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'somebodyelse',
                });
            });

            it('should return a random quote if no user is specified', function (done) {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: '',
                });
                setTimeout(function () {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1', jasmine.stringMatching(/^<somebody(else)?>/));
                    done();
                }, 50);
            });

            it('should filter quotes by user if specified', function (done) {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'somebody',
                });
                setTimeout(function () {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1', jasmine.stringMatching(/^<somebody>/));
                    done();
                }, 50);
            });

            it('should filter quotes by a word if specified', function (done) {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'somebody first',
                });
                setTimeout(function () {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1', '<somebody> first message');
                    done();
                }, 50);
            });

            it('should reply when a user is not found in the database', function (done) {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'someguy',
                });
                setTimeout(function () {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Sorry, I don\'t have any quotes from someguy.');
                    done();
                }, 50);
            });

            it('should reply when a word is not found in the database', function (done) {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'someguy someword',
                });
                setTimeout(function () {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Sorry, I don\'t have any quotes from someguy about "someword".');
                    done();
                }, 50);
            });
        });
    });
});
