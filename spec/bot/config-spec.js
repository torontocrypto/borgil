var Config = require('../../bot/config');


describe('Configuration object', function () {
    it('should set and get using dot notation', function () {
        var config = new Config();
        config.set('one.two.three', 'four');
        expect(config.get('one')).toEqual({
            two: {
                three: 'four',
            },
        });
        expect(config.get('one.two')).toEqual({
            three: 'four',
        });
        expect(config.get('one.two.three')).toEqual('four');
    });

    it('should set using mixed dot notation', function () {
        var config = new Config();
        config.set('one.two', {
            'three.four': {
                'five.six': 'seven',
            },
            'eight.nine': 'ten',
        });
        expect(config.get('one')).toEqual({
            two: {
                three: {
                    four: {
                        five: {
                            six: 'seven',
                        },
                    },
                },
                eight: {
                    nine: 'ten',
                },
            },
        });
    });

    it('should initialize using mixed dot notation', function () {
        var config = new Config({
            one: {
                two: {
                    three: 'four',
                },
            },
            'five.six': {
                seven: 'eight',
            },
            nine: {
                'ten.eleven': 'twelve',
            },
        });
        expect(config.get('one.two.three')).toEqual('four');
        expect(config.get('five.six.seven')).toEqual('eight');
        expect(config.get('nine.ten.eleven')).toEqual('twelve');
    });

    it('should set multiple mixed-dot values with some of the same roots', function () {
        var config = new Config({
            'one.two': 'three',
            'one.four': 'five',
        });
        expect(config.get('one')).toEqual({
            two: 'three',
            four: 'five',
        });
    });

    it('should get a default value for undefined paths', function () {
        var config = new Config({
            one: 'two',
            'three.four': 'five',
        });
        expect(config.get('one', 'default')).toEqual('two');
        expect(config.get('one.two', 'default')).toEqual('default');
        expect(config.get('three.five', 'default')).toEqual('default');
    });

    it('should parse objects inside of arrays', function () {
        var config = new Config({
            one: ['two', 'three'],
            'four.five': [{
                'six.seven': 'eight',
            }],
            'nine.ten': {
                eleven: ['twelve'],
            },
        });
        expect(config.get('one')).toEqual(['two', 'three']);
        expect(config.get('four.five')[0].six).toEqual({seven: 'eight'});
        expect(config.get('nine.ten.eleven')).toEqual(['twelve']);
    });
});
