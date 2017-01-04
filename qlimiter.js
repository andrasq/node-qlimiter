/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 *
 * 2016-12-20 - yet another spin - AR.
 */

'use strict';

var util = require('util');

// callQueue is a double-ended stack with methods push, shift, peek
// qlist is 3x faster than Array for 1k, and much much faster for 10k (35x), 100k (100x)
var CallQueue = require('qlist');

var Limit = require('./lib/Limit');
var LimitConcurrent = require('./lib/LimitConcurrent');
var LimitInterval = require('./lib/LimitInterval');
var LimitPerInterval = require('./lib/LimitPerInterval');

function qlimiter( call, options ) {
    var limiter = new Limiter(call, options);
    return limiter.wrapped;
}

module.exports = qlimiter;
module.exports.Limiter = Limiter;
module.exports.Limit = Limit;

// a nextTick that also queues arguments
var nextTick = (process.version >= 'v4') ? process.nextTick : global.setImmediate;

function Limiter( call, options ) {
    var self = this;
    var limits = new Array();

    if (!options) options = {};
    if (options.limits) limits = options.limits;
    if (options.maxConcurrent > 0) limits.push(new LimitConcurrent(parseInt(options.maxConcurrent)));
    if (options.minInterval > 0) limits.push(new LimitInterval(parseInt(options.minInterval)));
    if (options.maxPerInterval > 0) limits.push(new LimitPerInterval(options.maxPerInterval, options.interval || 1000));

// TODO: maxWaiting, maxWaitTime

    this.call = call;
    this.wrapped = qlimiter_wrapper;
    this.limits = limits;
    this.callQueue = new CallQueue();
    this.callQueues = {};
    this.onUnblock = onUnblock;
    this.waitingCount = 0;

    // create a forever timer with which to prevent an inadvertent program exit
    self.timer = setInterval(function(){}, 365.25 * 24 * 3600 * 1000);
    self.timer.unref();
    self.remainResident = false;

    // have the limits notify whenever a restriction unblocks
    for (var i=0; i<limits.length; i++) limits[i].setOnUnblock(onUnblock);

    function onUnblock( count ) {
        var args;
        do {
            args = self.callQueue.peek();
            if (args !== undefined) {
                if ((args = self._prepCall(args))) {
                    self.callQueue.shift();
                    self.waitingCount -= 1;
                    self._runCall(self.call, args);
                }
            }
            else {
                if (self.remainResident && self.waitingCount == 0) {
                    self.timer.unref();
                    self.remainResident = false;
                }
            }
        } while (count && args && --count > 0);
    }

    function qlimiter_wrapper() {
        var args;
        switch (arguments.length) {
        case 0: args = []; break;
        case 1: args = [arguments[0]]; break;
        case 2: args = [arguments[0], arguments[1]]; break;
        case 3: args = [arguments[0], arguments[1], arguments[2]]; break;
        default:
            args = new Array();
            for (var i=0; i<arguments.length; i++) args[i] = arguments[i];
            break;
        }
        return self.scheduleCall(args);
    }
}

Limiter.prototype.scheduleCall = function limiter_scheduleCall( args ) {
    if (typeof args[args.length - 1] !== 'function') {
        // TODO: queue the function too? then if no callback could wrap in own callbacked caller
        console.log("missing callback, skipped");
        return;
    }
    var startedArgs = this._prepCall(args);
    if (!startedArgs) {
        this.callQueue.push(args);
        // do not let program exit while we still have more calls to run
        this.waitingCount += 1;
        this.timer.ref();
        this.remainResident = true;
        return false;
    }
    else {
        // only run the call after the event loop finishes, to avoid callback-vs-init races
        nextTick(this._runCall, this.call, args);
        return true;
    }
}

// node v6 and v7 are both very very slow to apply a function to a pre-sized new Array(n).
// A new Array dynamically extended with push (or by just setting a[i]) is fast,
// and static compile-time array [1,2,...,n] is almost as fast,
// but a new Array(n) then for (i = 0 to n) a[i] = arguments[i] is 12x slower!!
Limiter.prototype._runCall = function _runCall( call, args ) {
    // launch the call and return true to indicate started
    switch (args.length) {
    case 0: call(); return true;
    case 1: call(args[0]); return true;
    case 2: call(args[0], args[1]); return true;
    case 3: call(args[0], args[1], args[2]); return true;
    default: call.apply(null, args); return true;
    }
}

Limiter.prototype._prepCall = function _prepCall( args ) {
    // obtain all needed permissions to run the call
    for (var i=0; i<this.limits.length; i++) {
        if (!this.limits[i].acquire(args)) {
            // if unable to run now, back out of the transaction, give back all the permissions
            for (--i; i>=0; i--) this.limits[i].release(args, 'fail');
            return false;
        }
    }

    // swap out the call callback so we know when the call finished
    var self = this;
    var cb = args[args.length - 1];
    args[args.length - 1] = function() {
        switch (arguments.length) {
        case 0: cbArgs = []; break;
        case 1: cbArgs = [arguments[0]]; break;
        case 2: cbArgs = [arguments[0], arguments[1]]; break;
        default:
            var cbArgs = new Array();
            for (var i=0; i<arguments.length; i++) cbArgs[i] = arguments[i];
            break;
        }

        // invoke the user callback
        self._runCall(cb, cbArgs);

        // relinquish the permissions to unblock the next call
        for (var i=self.limits.length-1; i>=0; i--) {
            self.limits[i].release(args);
        }
    }

    // if the call is ready to run now, return the call arguments to be used
    return args;
}

Limiter.prototype = Limiter.prototype;


/** quicktest:

var timeit = require('qtimeit');

var func = function(a, b, cb){
    cb(null, a+b);
}
var fn = qlimiter(func, { maxPerInterval: 3, interval: 100  });

var nloops = 7, ncalls = 0;
var t1 = Date.now();
for (var i=0; i<nloops; i++) {
    fn(11, 22, function(err, ret) {
        ncalls += 1;
        if (ncalls === nloops) {
            var t2 = Date.now();
            console.log("AR: DONE: got", err, ret);
            console.log("AR: DONE: %d calls in %d ms", nloops, t2 - t1);
        }
    })
}

/**/
