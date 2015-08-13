var MockPlugin = require('../helpers/mock-plugin');
var MockTransport = require('../helpers/mock-transport');


describe('Admin plugin', function () {
    var mockPlugin;
    var mockTransport;

    beforeEach(function () {
        mockPlugin = new MockPlugin('admin', {
            admins: ['admin'],
        });
        mockTransport = new MockTransport();
        mockTransport.channels = [
            '#channel1',
        ];
    });

    it('should join a new channel', function () {
        mockPlugin.bot.emit('command', mockTransport, {
            from: 'admin',
            command: 'join',
            args: '#newchannel',
        });
        expect(mockTransport.join).toHaveBeenCalledWith('#newchannel', jasmine.any(Function));
    });

    it('should refuse to join channels the bot is already in', function () {
        mockPlugin.bot.emit('command', mockTransport, {
            from: 'admin',
            replyto: '#channel1',
            command: 'join',
            args: '#channel1',
        });
        expect(mockTransport.join).not.toHaveBeenCalled();
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', "I'm already in that channel.");
    });

    it('should refuse to join channels if the caller is not an admin', function () {
        mockPlugin.bot.emit('command', mockTransport, {
            from: 'notadmin',
            command: 'join',
            args: '#newchannel',
        });
        expect(mockTransport.join).not.toHaveBeenCalled();
    });

    it('should part the channel', function () {
        mockPlugin.bot.emit('command', mockTransport, {
            from: 'admin',
            command: 'part',
            args: '#channel1',
        });
        expect(mockTransport.leave).toHaveBeenCalledWith('#channel1', null, jasmine.any(Function));
    });

    it('should part the channel with a message', function () {
        mockPlugin.bot.emit('command', mockTransport, {
            from: 'admin',
            command: 'part',
            args: '#channel1 Later, dudes!',
        });
        expect(mockTransport.leave).toHaveBeenCalledWith('#channel1', 'Later, dudes!', jasmine.any(Function));
    });

    it('should refuse to part channels the bot is not in', function () {
        mockPlugin.bot.emit('command', mockTransport, {
            from: 'admin',
            replyto: '#channel1',
            command: 'part',
            args: '#newchannel',
        });
        expect(mockTransport.leave).not.toHaveBeenCalled();
        expect(mockTransport.say).toHaveBeenCalledWith('#channel1', "I'm not in that channel.");
    });

    it('should refuse to part channels if the caller is not an admin', function () {
        mockPlugin.bot.emit('command', mockTransport, {
            from: 'notadmin',
            command: 'part',
            args: '#channel1',
        });
        expect(mockTransport.leave).not.toHaveBeenCalled();
    });
});
