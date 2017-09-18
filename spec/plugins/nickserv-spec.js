'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;
const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('IRC NickServ plugin', () => {
    let mockBot;
    let mockIRC;

    beforeEach(() => {
        const config = {
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

    it('should send an identify message to NickServ once registered', () => {
        mockIRC.irc.emit('registered');
        expect(mockIRC.say).toHaveBeenCalledWith('NickServ', 'IDENTIFY', 'borgilpass', 'borgil');
    });

    it('should send nick before password if so configured', () => {
        mockBot.config.set('plugins.nickserv.networks.irc.nick_first', true);
        mockIRC.irc.emit('registered');
        expect(mockIRC.say).toHaveBeenCalledWith('NickServ', 'IDENTIFY', 'borgil', 'borgilpass');
    });

    it('should join channels once identified on the network', () => {
        mockIRC.irc.emit('registered');
        mockIRC.irc.emit('notice', 'NickServ', 'borgil',
            'You are successfully identified as borgil.');
        expect(mockIRC.irc.join).toHaveBeenCalledWith('#torontocrypto channelkey');
        expect(mockIRC.irc.join).toHaveBeenCalledWith('#cryptoparty');
    });

    it('should send a NICK command if the current nick is not the desired one', () => {
        mockIRC.irc.emit('registered');
        mockIRC.irc.emit('notice', 'NickServ', 'borgil2',
            'You are successfully identified as borgil2.');
        expect(mockIRC.irc.send).toHaveBeenCalledWith('NICK', 'borgil');
    });
});
