/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */  

'use strict';

var util = require('util');
var QList = require('qlist');

var Limit = require('./Limit');
var Timeout = require('qtimeout');

function LimitPerInterval( max, interval ) {
    Limit.call(this);
    this.max = max;
    this.interval = interval;
    this.runningCount = 0;
    this.expireTimes = new Array();

    var self = this;
    self.expire = function() { self._expire() };
    self.timer = new Timeout(function(){ self._expire() });
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
    setTimeout(this.expire, this.interval);
    return;

    if (!this.timer.running) this.timer.start(this.interval);
    else this.expireTimes.push(Date.now() + this.interval);
}

LimitPerInterval.prototype._expire = function _expire( ) {
    this.runningCount -= 1;
    this.onUnblock();
    return;

    // each timer expiration corresponds to a finished call
    var ndone = 1;
    var now = Date.now();
    var next;

    while ((next = this.expireTimes.shift()) <= now) ndone += 1;

    if (next) this.timer.start(next - now);

    this.runningCount -= ndone;
    for (var i=0; i<ndone; i++) this.onUnblock();
}

LimitPerInterval.prototype = LimitPerInterval.prototype;


module.exports = LimitPerInterval;
