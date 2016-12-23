/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */  

'use strict';

function Limit( ) {
    this.onUnblock = function(){};
}

Limit.prototype.setOnUnblock = function limit_setOnUnblock( func ) {
    if (typeof func !== 'function') throw new Error("function required");
    this.onUnblock = func;
}

Limit.prototype.acquire = function limit_acquire( args ) {
    // return true on success, false if limit constrained
    return true;
}

Limit.prototype.release = function limit_release( args, isUndo ) {
    // notify limiter when restritction is lifted
    this.onUnblock();
}

Limit.prototype = Limit.prototype;


module.exports = Limit;
