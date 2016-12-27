/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */  

'use strict';

var util = require('util');
var Limit = require('./Limit');

// at most 1 per interval ms
function LimitInterval( interval ) {
    Limit.call(this);

    this.interval = interval;
    this.lastAt = 0;
    this.nextAt = 0;
}
util.inherits(LimitInterval, Limit);

LimitInterval.prototype.acquire = function acquire( args ) {
    var now = Date.now();

    if (now < this.nextAt) {
        return false;
    }

    this.lastAt = this.nextAt;
    this.nextAt = now + this.interval;
    return true;
}

LimitInterval.prototype.release = function release( args, isUndo ) {
    // both unblock the next call as well as undo an acquire
    if (isUndo) this.nextAt = this.lastAt;
    else {
        var self = this;
        var now = Date.now();
        if (now >= this.nextAt) this.onUnblock();
        // +1 because timeout can trigger 1ms too early
        else setTimeout(function(){ self.onUnblock() }, this.nextAt - Date.now() + 1);
    }
}

LimitInterval.prototype = LimitInterval.prototype;


module.exports = LimitInterval;


// at most N per interval
function LimitPerInterval( max, interval ) {
    this.max = max;
    this.startTimes = new QHeap();

    if (typeof interval !== 'number') switch (interval) {
    case 'second': this.interval = 1000; break;
    case 'minute': this.interval = 60000; break;
    case 'hour': this.interval = 3600000; break;
    case 'day': this.interval = 24*3600*1000; break;
    default: throw new Error("unrecognized interval " + interval);
    }
}
