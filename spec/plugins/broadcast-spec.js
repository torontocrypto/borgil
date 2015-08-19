var MockBot = require('../helpers/mock-bot');
var MockTransport = require('../helpers/mock-transport');


describe('Broadcast plugin', function () {
    var mockBot;
    var ircA;
    var ircB;

    beforeEach(function () {
        mockBot = new MockBot();

        ircA = new MockTransport();
        ircA.name = 'ircA';
        ircA.channels = [
            '#channelA',
            '#channelAAA',
            '#channelZZZ',
        ];
        ircB = new MockTransport();
        ircB.name = 'ircB';
        ircB.channels = [
            '#channelB',
        ];
        mockBot.transports = {
            ircA: ircA,
            ircB: ircB,
        };

        mockBot.use('broadcast');
    });

    describe('broadcasting to all', function () {
        beforeEach(function () {
            mockBot.config.set('plugins.broadcast.broadcast_all', true);
        });

        it('should emit messages to all other channels on all transports', function () {
            mockBot.emit('message', ircA, {
                from: 'somebody',
                replyto: '#channelA',
                text: 'Message text',
            });
            expect(ircA.say.calls.count()).toEqual(2);
            expect(ircB.say.calls.count()).toEqual(1);
            expect(ircA.say).toHaveBeenCalledWith('#channelAAA', '[#channelA] <somebody> Message text');
            expect(ircA.say).toHaveBeenCalledWith('#channelZZZ', '[#channelA] <somebody> Message text');
            expect(ircB.say).toHaveBeenCalledWith('#channelB', '[ircA:#channelA] <somebody> Message text');
        });
    });

    describe('broadcasting to sets', function () {
        beforeEach(function () {
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
                        transpost: 'ircA',
                        channel: '#channelZZZ',
                    },
                ],
            ]);
        });

        it('should emit messages to other channels in the same set', function () {
            mockBot.emit('message', ircA, {
                from: 'somebody',
                replyto: '#channelA',
                text: 'Message text',
            });
            expect(ircA.say).not.toHaveBeenCalled();
            expect(ircB.say.calls.count()).toEqual(1);
            expect(ircB.say).toHaveBeenCalledWith('#channelB', '[ircA:#channelA] <somebody> Message text');
        });
    });
});