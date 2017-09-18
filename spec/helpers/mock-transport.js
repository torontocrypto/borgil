'use strict';

const EventEmitter = require('eventemitter2').EventEmitter2;


module.exports = class MockTransport extends EventEmitter {
    constructor(name) {
        super();

        this.name = name || 'mockTransport';
        this.channels = [];

        this.say = jasmine.createSpy();
        this.join = jasmine.createSpy();
        this.leave = jasmine.createSpy();
        this.connect = jasmine.createSpy();
        this.disconnect = jasmine.createSpy();
    }
};
