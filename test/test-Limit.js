/**
 * qlimiter - nodejs call limiter
 *
 * Copyright (C) 2016 Andras Radics
 * Licensed under the Apache License, Version 2.0
 */

'use strict';

var qlimiter = require('../');
var Limit = require('../lib/Limit');

module.exports = {
    'should export Limit': function(t) {
        t.equal(typeof Limit, 'function');
        t.equal(qlimiter.Limit, Limit);
        t.done();
    },

    'should have expected methods': function(t) {
        var lim = new Limit();
        t.equal(typeof lim.acquire, 'function');
        t.equal(typeof lim.release, 'function');
        t.equal(typeof lim.setOnUnblock, 'function');
        t.done();
    },

    'setOnUnblock should reject non-function': function(t) {
        var lim = new Limit();
        t.throws(function(){ lim.setOnUnblock(1) });
        t.done();
    },

    'should release without an onUnblock callback': function(t) {
        var lim = new Limit();
        t.equal(lim.acquire(), true);
        lim.release();
        t.done();
    },

    'should invoke onUnblock when restriction lifted': function(t) {
        var lim = new Limit();
        lim.setOnUnblock(function(){
            t.done();
        })
        t.equal(typeof lim.acquire(), 'boolean');
        lim.release();
    },
};
