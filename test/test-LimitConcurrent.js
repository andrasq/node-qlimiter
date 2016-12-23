/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var qlimiter = require('../');
var LimitConcurrent = require('../lib/LimitConcurrent');

module.exports = {
    beforeEach: function(done) {
        this.maxConcurrent = 2;
        this.limit = new LimitConcurrent(this.maxConcurrent);
        done();
    },

    'should be a Limit': function(t) {
        t.assert(this.limit instanceof qlimiter.Limit);
        t.done();
    },

    'should cap running calls': function(t) {
        var ok;
        this.limit.acquire();
        ok = this.limit.acquire();
        t.assert(ok);
        ok = this.limit.acquire();
        t.assert(!ok);
        t.equal(this.limit.running, 2);
        t.done();
    },

    'should unblock on release': function(t) {
        var called = false;
        function onUnblock() { called = true };
        this.limit.setOnUnblock(onUnblock);
        this.limit.acquire();
        this.limit.release();
        t.assert(called);
        t.done();
    },
};
