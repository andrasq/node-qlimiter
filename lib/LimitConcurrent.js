/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */  

'use strict';

var util = require('util');
var Limit = require('./Limit');

function LimitConcurrent( max ) {
    Limit.call(this);
    this.max = max;
    this.running = 0;
}
util.inherits(LimitConcurrent, Limit);

LimitConcurrent.prototype.acquire = function acquire( ) {
    if (this.running >= this.max) return false;
    return this.running += 1;
}

LimitConcurrent.prototype.release = function release( ) {
    this.running -= 1;
    this.onUnblock();
}

LimitConcurrent.prototype = LimitConcurrent.prototype;


module.exports = LimitConcurrent;
