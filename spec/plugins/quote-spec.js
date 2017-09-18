'use strict';

const mkdirp = require('mkdirp');
const path = require('path');

const Bot = require('../../bot/bot');
const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('Quote plugin', () => {
    let mockBot;
    let mockTransport;
    let db;

    beforeEach((done) => {
        mkdirp.sync(path.join(__dirname, '../temp'));

        mockBot = new MockBot({
            dbdir: path.join(__dirname, '../temp'),
            plugins: {quote: {}},
        });
        Bot.prototype.initBuffers.call(mockBot); // Add normal buffer functionality.
        mockTransport = new MockTransport();

        // Clear the database and set up spies.
        db = mockBot.plugins.quote.db;
        db.remove({}, {multi: true}, () => {
            spyOn(db, 'insert').and.callThrough();
            spyOn(db, 'find').and.callThrough();
            done();
        });
    });

    describe('commands', () => {
        beforeEach(() => {
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

        it('should remember the most recent message if no user is specified', (done) => {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: '',
            });
            expect(db.insert).toHaveBeenCalledWith(jasmine.objectContaining({
                transport: 'mockTransport',
                from: 'somebodyelse',
                replyto: '#channel1',
                text: 'third message',
            }), jasmine.any(Function));
            setTimeout(() => {
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                    'Remembered somebodyelse saying "third message".');
                done();
            }, 50);
        });

        it('should filter messages by user if specified', (done) => {
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
            setTimeout(() => {
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                    'Remembered somebody saying "second message".');
                done();
            }, 50);
        });

        it('should filter messages by a word if specified', (done) => {
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
            setTimeout(() => {
                expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                    'Remembered somebody saying "first message".');
                done();
            }, 50);
        });

        it('should reply when a user is not found in the buffer', () => {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: 'someguy',
            });
            expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                'Sorry, I can\'t remember anything someguy said recently.');
        });

        it('should reply when a word is not found in the buffer', () => {
            mockBot.emit('command', mockTransport, {
                replyto: '#channel1',
                command: 'remember',
                args: 'someguy someword',
            });
            expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                'Sorry, I can\'t remember what someguy said about "someword" recently.');
        });

        describe('quote retrieval', () => {
            beforeEach(() => {
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

            it('should return a random quote if no user is specified', (done) => {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: '',
                });
                setTimeout(() => {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                        jasmine.stringMatching(/^<somebody(else)?>/));
                    done();
                }, 50);
            });

            it('should filter quotes by user if specified', (done) => {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'somebody',
                });
                setTimeout(() => {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                        jasmine.stringMatching(/^<somebody>/));
                    done();
                }, 50);
            });

            it('should filter quotes by a word if specified', (done) => {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'somebody first',
                });
                setTimeout(() => {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                        '<somebody> first message');
                    done();
                }, 50);
            });

            it('should reply when a user is not found in the database', (done) => {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'someguy',
                });
                setTimeout(() => {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                        'Sorry, I don\'t have any quotes from someguy.');
                    done();
                }, 50);
            });

            it('should reply when a word is not found in the database', (done) => {
                mockBot.emit('command', mockTransport, {
                    replyto: '#channel1',
                    command: 'quote',
                    args: 'someguy someword',
                });
                setTimeout(() => {
                    expect(mockTransport.say).toHaveBeenCalledWith('#channel1',
                        'Sorry, I don\'t have any quotes from someguy about "someword".');
                    done();
                }, 50);
            });
        });
    });
});
