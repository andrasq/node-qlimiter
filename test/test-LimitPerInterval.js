/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var qlimiter = require('../');
var LimitPerInterval = require('../lib/LimitPerInterval');

module.exports = {
    beforeEach: function(done) {
        this.limit = new LimitPerInterval(2, 10);
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
        t.equal(this.limit.runningCount, 2);
        t.done();
    },

    'should unblock on release': function(t) {
        var called = false;
        function onUnblock() { called = true };
        this.limit.setOnUnblock(onUnblock);
        this.limit.acquire();
        this.limit.acquire();
        this.limit.release();
        setTimeout(function() {
            t.assert(called);
            t.done();
        }, 12);
    },
};
