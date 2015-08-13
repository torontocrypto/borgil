var EventEmitter = require('eventemitter2').EventEmitter2;
var util = require('util');


var MockTransport = module.exports = function () {
    EventEmitter.call(this);

    this.name = 'mockTransport';
    this.channels = [];

    this.say = jasmine.createSpy();
    this.join = jasmine.createSpy();
    this.leave = jasmine.createSpy();
    this.connect = jasmine.createSpy();
    this.disconnect = jasmine.createSpy();
};
util.inherits(MockTransport, EventEmitter);
