'use strict';

const MockBot = require('../helpers/mock-bot');
const MockTransport = require('../helpers/mock-transport');


describe('Broadcast plugin', () => {
    let mockBot;
    let ircA;
    let ircB;

    beforeEach(() => {
        mockBot = new MockBot({
            'plugins.broadcast.template': '[{{{source}}}] <{{{from}}}> {{{text}}}',
        });

        ircA = mockBot.transports.ircA = new MockTransport('ircA');
        ircA.channels = [
            '#channelA',
            '#channelAAA',
            '#channelZZZ',
        ];
        ircB = mockBot.transports.ircB = new MockTransport('ircB');
        ircB.channels = [
            '#channelB',
        ];
    });

    describe('broadcasting to all', () => {
        beforeEach(() => {
            mockBot.config.set('plugins.broadcast.broadcast_all', true);
        });

        it('should emit messages to all other channels on all transports', () => {
            mockBot.emit('message', ircA, {
                from: 'somebody',
                replyto: '#channelA',
                text: 'Message text',
            });
            expect(ircA.say.calls.count()).toEqual(2);
            expect(ircB.say.calls.count()).toEqual(1);
            expect(ircA.say).toHaveBeenCalledWith('#channelAAA',
                '[#channelA] <somebody> Message text');
            expect(ircA.say).toHaveBeenCalledWith('#channelZZZ',
                '[#channelA] <somebody> Message text');
            expect(ircB.say).toHaveBeenCalledWith('#channelB',
                '[ircA:#channelA] <somebody> Message text');
        });
    });

    describe('broadcasting to sets', () => {
        beforeEach(() => {
            mockBot.config.set('plugins.broadcast.target_sets', [
                [
                    {
                        transport: 'ircA',
                        channel: '#channelA',
                    },
                    {
                        transport: 'ircB',
                        channel: '#channelB',
                    },
                ],
                [
                    {
                        transport: 'ircA',
                        channel: '#channelAAA',
                    },
                    {
                        transport: 'ircA',
                        channel: '#channelZZZ',
                    },
                ],
            ]);
        });

        it('should emit messages to other channels in the same set', () => {
            mockBot.emit('message', ircA, {
                from: 'somebody',
                replyto: '#channelA',
                text: 'Message text',
            });
            expect(ircA.say).not.toHaveBeenCalled();
            expect(ircB.say.calls.count()).toEqual(1);
            expect(ircB.say).toHaveBeenCalledWith('#channelB',
                '[ircA:#channelA] <somebody> Message text');
        });
    });
});
