qlimiter
========


Quick call rate limiter, for all function calls taking a callback as the last argument.

Quick Start
-----------

    var qlimiter = require('qlimiter');
    var rateLimitedFunc = qlimiter(func, {maxConcurrent: 10});
    rateLimitedFunc(1, 2, function(err, ret) {
        // ret => 3
    })

    function func(a, b, cb) {
        var ret = a + b;
        cb(null, ret);
    }
