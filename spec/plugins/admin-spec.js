'use strict';

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('Admin plugin', () => {
    let mockBot;
    let mockTransport;

    beforeEach(() => {
        mockBot = new MockBot({
            admins: ['admin'],
            plugins: {admin: {}},
        });
        mockTransport = new MockTransport();
        mockTransport.channels = [
            '#channel1',
        ];
    });

    it('should join a new channel', () => {
        mockBot.emit('command', mockTransport, {
            from: 'admin',
            command: 'join',
            args: '#newchannel',
        });
        expect(mockTransport.join).toHaveBeenCalledWith('#newchannel', jasmine.any(Function));
    });

    it('should refuse to join channels the bot is already in', () => {
        mockBot.emit('command', mockTransport, {
            from: 'admin',
            replyto: '#channel1',
            command: 'join',
            args: '#channel1',
        });
        expect(mockTransport.join).not.toHaveBeenCalled();
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', "I'm already in that channel.");
    });

    it('should refuse to join channels if the caller is not an admin', () => {
        mockBot.emit('command', mockTransport, {
            from: 'notadmin',
            command: 'join',
            args: '#newchannel',
        });
        expect(mockTransport.join).not.toHaveBeenCalled();
    });

    it('should part the channel', () => {
        mockBot.emit('command', mockTransport, {
            from: 'admin',
            command: 'part',
            args: '#channel1',
        });
        expect(mockTransport.leave).toHaveBeenCalledWith('#channel1', null, jasmine.any(Function));
    });

    it('should part the channel with a message', () => {
        mockBot.emit('command', mockTransport, {
            from: 'admin',
            command: 'part',
            args: '#channel1 Later, dudes!',
        });
        expect(mockTransport.leave).toHaveBeenCalledWith('#channel1', 'Later, dudes!',
            jasmine.any(Function));
    });

    it('should refuse to part channels the bot is not in', () => {
        mockBot.emit('command', mockTransport, {
            from: 'admin',
            replyto: '#channel1',
            command: 'part',
            args: '#newchannel',
        });
        expect(mockTransport.leave).not.toHaveBeenCalled();
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', "I'm not in that channel.");
    });

    it('should refuse to part channels if the caller is not an admin', () => {
        mockBot.emit('command', mockTransport, {
            from: 'notadmin',
            command: 'part',
            args: '#channel1',
        });
        expect(mockTransport.leave).not.toHaveBeenCalled();
    });
});
