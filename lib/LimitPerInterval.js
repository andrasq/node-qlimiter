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
}
util.inherits(LimitPerInterval, Limit);

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

    // NOTE: timeouts can trigger 1 ms early! (node v6.9.1)
//    this.finishTimes.push(Date.now());
    setTimeout(this.expire, this.interval);
}

LimitPerInterval.prototype._expire = function _expire( ) {
    this.runningCount -= 1;
    this.onUnblock();
}

LimitPerInterval.prototype = LimitPerInterval.prototype;


module.exports = LimitPerInterval;
