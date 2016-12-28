/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var Timer = require('../lib/Timer');

var testTimer = {
    'should be instanceof type': function(t) {
        t.assert(this.timer instanceof this.type);
        t.done();
    },

    'should require a callback': function(t) {
        var self = this;
        try {
            new self.type();
            t.fail();
        }
        catch (err) {
            t.done();
        }
    },

    'should start / stop': function(t) {
        this.timer.stop();
        this.timer.start(10);
        this.timer.stop();
        t.done();
    },

    'should ref / unref': function(t) {
        // q: how to verify?
        this.timer.unref();
        this.timer.ref();
        this.timer.unref();
        t.done();
    },

    'should call function on timeout': function(t) {
        var t1 = Date.now();
        t.assert(!this.called);
        this.timer.start(10);
        var self = this;
        setTimeout(function() {
            var t2 = Date.now();
            t.assert(t2 >= t1 + 10);
            t.assert(self.called);
            t.done();
        }, 12);
    },

    'second start should reset timeout': function(t) {
        var t0 = Date.now();
        this.timer.start(20);
        var self = this;
        setTimeout(function() {
            var t1 = Date.now();
            self.timer.start(12);
            setTimeout(function() {
                var t2 = Date.now();
                t.assert(t2 >= t1 + 12);
                t.assert(t2 >= t0 + 12 + 5);
                t.equal(self.called, 1);
                t.done();
            }, 14);
        }, 5);
    },

    'should start unref-d timer': function(t) {
        this.timer.unref();
        this.timer.start(1);
        t.done();
    },

    'should start ref-d timer': function(t) {
        this.timer.ref();
        this.timer.start(1);
        t.done();
    },

    'reset speed': function(t) {
        var nloops = 20000;
        var t1 = Date.now();
        this.timer.start(20);
        for (var i=0; i<nloops; i++) this.timer.start(10 + i%2 ? 2 : 0);
        var t2 = Date.now();
        this.timer.stop();
        console.log("AR: %d restarts in %d ms", nloops, t2 - t1);
        t.done();
    },
};


module.exports = {
    beforeEach: function(done) {
        var self = this;
        this.called = 0;
        this.callback = function(){ self.called += 1 };
        this.type = Timer;
        this.timer = new Timer(this.callback);
        done();
    },

    'should export timer classes': function(t) {
        t.equal(typeof Timer.Timer, 'function');
        t.equal(typeof Timer.TimeoutTimer, 'function');
        t.equal(typeof Timer.NativeTimer, 'function');
        t.done();
    },

    'Timer': {
        tests: testTimer,
    },

    'TimeoutTimer': {
        beforeEach: function(done) {
            this.type = Timer.TimeoutTimer;
            this.timer = new Timer.TimeoutTimer(this.callback);
            done();
        },

        tests: testTimer,
    },

    'NativeTimer': {
        beforeEach: function(done) {
            this.type = Timer.NativeTimer;
            this.timer = new Timer.NativeTimer(this.callback);
            done();
        },

        tests: testTimer,
    }
}
