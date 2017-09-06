var EventEmitter = require('eventemitter2').EventEmitter2;
var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('IRC NickServ plugin', function () {
    var mockBot;
    var mockIRC;

    beforeEach(function () {
        var config = {
            'transports.irc.nick': 'borgil',
            'plugins.nickserv.networks.irc': {
                password: 'borgilpass',
                success: 'You are successfully identified',
                channels: [
                    '#torontocrypto',
                    '#cryptoparty',
                ],
                channel_keywords: {
                    '#torontocrypto': 'channelkey',
                },
            },
        };

        mockIRC = new MockTransport('irc');
        mockIRC.irc = new EventEmitter();
        mockIRC.irc.join = jasmine.createSpy();
        mockIRC.irc.send = jasmine.createSpy();

        mockBot = new MockBot(config, {irc: mockIRC});
    });

    it('should send an identify message to NickServ once registered', function () {
        mockIRC.irc.emit('registered');
        expect(mockIRC.say).toHaveBeenCalledWith('NickServ', 'IDENTIFY', 'borgilpass', 'borgil');
    });

    it('should send nick before password if so configured', function () {
        mockBot.config.set('plugins.nickserv.networks.irc.nick_first', true);
        mockIRC.irc.emit('registered');
        expect(mockIRC.say).toHaveBeenCalledWith('NickServ', 'IDENTIFY', 'borgil', 'borgilpass');
    });

    it('should join channels once identified on the network', function () {
        mockIRC.irc.emit('registered');
        mockIRC.irc.emit('notice', 'NickServ', 'borgil', 'You are successfully identified as borgil.');
        expect(mockIRC.irc.join).toHaveBeenCalledWith('#torontocrypto channelkey');
        expect(mockIRC.irc.join).toHaveBeenCalledWith('#cryptoparty');
    });

    it('should send a NICK command if the current nick is not the desired one', function () {
        mockIRC.irc.emit('registered');
        mockIRC.irc.emit('notice', 'NickServ', 'borgil2', 'You are successfully identified as borgil2.');
        expect(mockIRC.irc.send).toHaveBeenCalledWith('NICK', 'borgil');
    });
});
