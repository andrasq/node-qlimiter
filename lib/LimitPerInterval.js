/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */  

'use strict';

var util = require('util');
var Limit = require('./Limit');

function LimitPerInterval( max, interval ) {
    Limit.call(this);
    this.max = max;
    this.interval = interval;
    this.runningCount = 0;
    // TODO: use a circular buffer (qlist)
    this.finishTimes = new Array();

    var self = this;
    self.expire = function() { self._expire() };
//    this.cleaner = setInterval(self.expire, Math.max(interval/20, 1));
//    this.cleaner.unref();
}
util.inherits(LimitPerInterval, Limit);

// check whether ok to make a call right now
// `runningCount` counts calls made in the current sliding interval window
LimitPerInterval.prototype.acquire = function acquire( args ) {
    if (this.runningCount >= this.max) return false;
    this.runningCount += 1;
    return true;
}

LimitPerInterval.prototype.release = function release( args, isUndo ) {
    if (isUndo) {
        this.runningCount -= 1;
        return;
    }

    this.finishTimes.push(Date.now());
    setTimeout(this.expire, this.interval + 1);
}

LimitPerInterval.prototype._expire = function _expire( ) {
    this.runningCount -= 1;
    this.onUnblock();
    return;

    var slots = 0;
    var intervalStart = Date.now() - this.interval;
    while (this.finishTimes.length && this.finishTimes[0] < intervalStart) {
        this.finishTimes.shift();
        slots += 1;
    }
    if (slots) this.onUnblock(slots);
}

LimitPerInterval.prototype = LimitPerInterval.prototype;


module.exports = LimitPerInterval;
