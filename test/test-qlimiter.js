/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var qlimiter = require('../');
var Limiter = qlimiter.Limiter;
var Limit = qlimiter.Limit;
var LimitPerInterval = require('../lib/LimitPerInterval');

module.exports = {
    'setup': {
        'should have valid package.json': function(t) {
            require('../package.json');
            t.done();
        },
    },

    'qlimiter': {
        'should create a new function': function(t) {
            var f = qlimiter(function(cb){ cb() });
            t.assert(typeof f === 'function');
            t.assert(f !== qlimiter);
            t.done();
        },

        'returned function should invoke the call': function(t) {
            var f = qlimiter(function(a, cb){ cb() });
            f(1, function(){ t.done() });
        },

        'should return callback arg': function(t) {
            var uniq = (Math.random() * 0x1000000).toString(16);
            var f = qlimiter(function(cb){ cb(uniq) });
            f(function(ret) {
                t.equal(ret, uniq);
                t.done();
            });
        },

        'should skip calls without a callback function': function(t) {
            var f = qlimiter(function(cb){ t.fail() });
            f();
            setTimeout(function(){ t.done() }, 10);
        },

        'should accept and return variable numbers of arguments': function(t) {
            var func = function(n) {
                var cb = arguments[arguments.length - 1];
                if (n != arguments.length - 1) return cb(new Error("wrong arg count"));
                for (var i=0; i<n; i++) t.assert(arguments[i] == n - i);
                cb.apply(null, arguments);
            };
            var cb = function(n){
                for (var i=0; i<n; i++) t.assert(arguments[i] == n - i);
            };
            var f = qlimiter(func);
            f(1, cb);
            f(2, 1, cb);
            f(3, 2, 1, cb);
            f(5, 4, 3, 2, 1, cb);
            f(10, 9, 8, 7, 6, 5, 4, 3, 2, 1, cb);
            setTimeout(function(){ t.done() }, 10);
        },

        'options': {
            'should limit by concurrency': function(t) {
                var runningCount = 0;
                var doneCount = 0;
                var func = function(cb) {
                    runningCount += 1;
                    if (runningCount > 2) cb(new Error("too many running"));
                    else setTimeout(cb, 1);
                };
                var cb = function(err) {
                    runningCount -= 1;
                    doneCount += 1;
                    if (err) t.done(err);
                    if (doneCount == 10) t.done();
                };
                var f = qlimiter(func, { maxConcurrent: 1 });
                for (var i=0; i<10; i++) f(cb);
            },

            'should impose interval': function(t) {
                var limited = qlimiter(function(cb){ cb() }, { minInterval: 10 });
                var ncalls = 0;
                var t1 = Date.now();
                limited(after);
                limited(after);
                function after() {
                    ncalls += 1;
                    var t2 = Date.now();
                    if (ncalls < 2) {
                        t.assert(t2 < t1 + 5);
                    }
                    else {
                        t.assert(t2 >= t1 + 10);
                        t.done();
                    }
                }
            },

            'should limit calls per interval': function(t) {
                var limited = qlimiter(function(cb){ cb() }, { maxPerInterval: 2, interval: 10 });
                var ncalls = 0;
                var t1 = Date.now();
                limited(after);
                limited(after);
                limited(after);
                function after() {
                    ncalls += 1;
                    var t2 = Date.now();
                    if (ncalls < 3) {
                        t.assert(t2 < t1 + 5);
                    }
                    else {
                        // node can trigger timeout 1 ms too early
                        t.assert(t2 >= t1 + 10 - 1);
                        t.done();
                    }
                }
            },
        }
    },

    'Limiter': {

        beforeEach: function(done) {
            var self = this;
            this.acquireArgs = [];
            this.releaseArgs = [];
            this.acquireCount = 0;
            this.releaseCount = 0;
            this.acquireReturns = [true, true, true, true, true, true];
            this.limit = {
                acquire: function(args) { self.acquireCount += 1; self.acquireArgs.push(args); return self.acquireReturns.shift() },
                release: function(args) { self.releaseCount += 1; self.releaseArgs.push(args); },
                setOnUnblock: function(fn){ this.onUnblock = fn; return this },
                onUnblock: function(){ },
            };
            done();
        },

        'should export Limiter': function(t) {
            t.equal(typeof Limiter, 'function');
            t.done();
        },

        'should have expected methods and properties': function(t) {
            var fn = function(cb){ cb() };
            var limiter = new Limiter(fn, {});
            t.equal(typeof limiter.wrapped, 'function');
            t.equal(typeof limiter.scheduleCall, 'function');
            t.equal(typeof limiter._prepCall, 'function');
            t.done();
        },

        'should accept limits in options': function(t) {
            var limit1Tested = false, limit2Tested = false;
            var fn = function(cb){ cb() };
            var limit1 = new Limit();
            var limit2 = new Limit();
            limit1.acquire = function(){ limit1Tested = true; return true };
            limit2.acquire = function(){ limit2Tested = true; return true };
            var limiter = new Limiter(fn, {limits: [limit1, limit2]});
            var started = limiter.wrapped(function(){
                t.assert(limit1Tested);
                t.assert(limit2Tested);
                t.done();
            })
            t.assert(started);
        },

        'should pass distinct args to acquire': function(t) {
            var self = this;
            var limited = qlimiter(function(){}, { limits: [ self.limit ] });
            limited(1,2,3, function(){});
            limited(1,2,3, function(){});
            limited(1,2,3, function(){});
            setTimeout(function(){ 
                t.equal(self.acquireArgs.length, 3);
                t.notEqual(self.acquireArgs[0], self.acquireArgs[1]);
                t.notEqual(self.acquireArgs[0], self.acquireArgs[2]);
                t.notEqual(self.acquireArgs[1], self.acquireArgs[2]);
                t.done();
            }, 2);
        },

        'should pass args to release': function(t) {
            var self = this;
            var limited = qlimiter(function(a,b,c,cb){ cb() }, { limits: [ self.limit ] });
            limited(1,2,3, function() {
                setTimeout(function() {
                    t.equal(self.acquireArgs.length, 1);
                    t.equal(self.acquireArgs[0], self.releaseArgs[0]);
                    t.done();
                }, 2);
            });
        },

        'should default to interval of 1 sec': function(t) {
            var limiter = new Limiter(function(){}, { maxPerInterval: 2 });
            t.assert(limiter.limits[0] instanceof LimitPerInterval);
            t.equal(limiter.limits[0].interval, 1000);
            t.equal(limiter.limits[0].max, 2);
            t.done();
        },

        'should delay call until a limit unblocks': function(t) {
            var limit1acquired = false, limit1released = false, limit2tested = false, limit3tested = false;
            var fn = function(cb){ cb() };
            var limit1 = new Limit();
            var limit2 = new Limit();
            var limit3 = new Limit();
            limit1.acquire = function(){ limit1acquired = true; return true };
            limit1.release = function(){ limit1released = true };
            limit2.acquire = function(){ var first = !limit2tested; limit2tested = true; return !first };
            limit3.acquire = function(){ limit3tested = true; return true };
            var limiter = new Limiter(fn, {limits: [limit1, limit2]});
            var callTime = Date.now();
            var cb = function() {
                var now = Date.now();
                t.assert(now >= callTime + 5);
                t.done();
            }
            var started = limiter.wrapped(cb);
            t.assert(!started);
            t.assert(limit1acquired && limit1released && limit2tested && !limit3tested);
            // +1 since the timeout can trigger 1 ms early, node-v0.10.42 and v6.9.1 both
            setTimeout(function(){ limit2.onUnblock() }, 5 + 1);
        },

        'should unblock specific waiting calls': function(t) {
            var self = this;
            self.acquireReturns = [false, false, false, true];
            var limiter = new Limiter(function(){}, { limits: [ this.limit ] });
            var limited = limiter.wrapped;

            function onDone() { }
            limited(1, 2, onDone);
            limited(3, 4, onDone);
            limited(5, 6, onDone);

            t.equal(self.acquireCount, 3);
            self.limit.onUnblock('nonesuch');
            t.equal(self.acquireCount, 3);

            self.limit.onUnblock(false);
            t.equal(self.acquireCount, 4);

            t.done();
        },
    },

    'speed': {
        'should run fast': function(t) {
            var ntests = 0, ncalls = 0, ndone = 0;
            var lim = new Limit();
            // pass-fail-pass-fail gating
            lim.acquire = function(){ return (ntests++ & 1) === 0 };
            // FIXME: fail-pass-fail-pass gating hangs! and does not complete
            //lim.acquire = function(){ return (ntests++ & 1) !== 0 };
            lim.release = function(){ this.onUnblock() };
            var t1 = Date.now();
            var fn = function(n, cb) {
                ncalls += 1;
                cb();
            }
            var loopCount = 10000;
            var cb = function() {
                ndone += 1;
                if (ndone == loopCount) {
                    var t2 = Date.now();
                    console.log("AR: %d calls in %d ms", loopCount, t2 - t1);
                    t.equal(ntests, 2 * loopCount - 1);
                    t.equal(ncalls, ndone);
                    // expect at least 10k calls / second (measured 1000k)
                    t.assert(t2 - t1 < 1000);
                    t.done();
                }
            }
            // 10ms for 10k:
            var limiter = new Limiter(fn, { limits: [ lim ] });
            for (var i=0; i<loopCount; i++) limiter.wrapped(i, cb);

            // maxConcurrent is 9ms for 10k:
            //var limitedFunc = qlimiter(fn, { maxConcurrent: 2 });
            //for (var i=0; i<loopCount; i++) limitedFunc(i, cb);
        },
    }
}
