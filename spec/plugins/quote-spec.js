var fs = require('fs');
var mkdirp = require('mkdirp');
var path = require('path');

var buffer = require('../../bot/buffer.js');

var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('Quote plugin', function () {
    var mockBot;
    var mockTransport;

    beforeEach(function () {
        // Create a blank database file.
        mkdirp.sync(path.join(__dirname, '../temp'));
        fs.writeFileSync(path.join(__dirname, '../temp/quote.db'), '');

        mockBot = new MockBot({
            dbdir: path.join(__dirname, '../temp')
        });
        buffer.call(mockBot);  // Add normal buffer functionality.
        mockBot.use('quote');
        mockTransport = new MockTransport();
    });

    describe('commands', function () {
        beforeEach(function () {
            mockBot.emit('message', mockTransport, {
                from: 'somebody',
                replyto: '#channel1',
                text: 'first message',
            });
            mockBot.emit('message', mockTransport, {
                from: 'somebodyelse',
                replyto: '#channel1',
                text: 'second message',
            });
        });

        // it('should find a matching message by a user and add it to the database', function (done) {
        //     mockBot.emit('command', mockTransport, {
        //         replyto: '#channel1',
        //         command: 'remember',
        //         args: 'first',
        //     });
        //     setTimeout(function () {
        //         expect(mockTransport.say).toHaveBeenCalledWith('#channel1', 'Remembered somebody saying: first message');
        //         done();
        //     }, 50);
        // });

        // it('should retrieve a quote that has been stored', function (done) {
        //     mockBot.emit('command', mockTransport, {
        //         replyto: '#channel1',
        //         command: 'remember',
        //         args: 'first',
        //     });
        //     setTimeout(function () {
        //         mockBot.emit('command', mockTransport, {
        //             replyto: '#channel1',
        //             command: 'quote',
        //             args: 'somebody',
        //         });
        //         setTimeout(function () {
        //             expect(mockTransport.say).toHaveBeenCalledWith('#channel1', '<somebody> first message');
        //             done();
        //         }, 50);
        //     });
        // });

        it('should remember the most recent message if no user is specified');

        it('should filter messages by user if specified');

        it('should filter messages by a word if specified');

        it('should return a random quote if no user is specified');

        it('should filter quotes by user if specified');

        it('should filter quotes by a word if specified');

        it('should send a reply when a matching message is not found in the buffer');
    });
});
