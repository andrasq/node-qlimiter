qlimiter
========


Quick configurable, extendable call rate limiter, for all function calls taking a
callback as the last argument.

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


Api
---

### qlimiter( func, [options] )


Extending
---------

Custom limits can be plugged into the qlimiter limits stack.
custom limits take effect before built-in limits.

A custom limit inherits from `qlimiter.Limit` or must implements methods

`setOnUnblock( onUnblock )` - function to notify the limiter that the resource
usage has dropped below the limit threshold.

`acquire( args )` - called to test whether a call can run.  Return true to allow
the call to run now, false to block it until later.  If blocked, must notify the
limiter when unblocked with the `onUnblock` method.  Acquire is presented the
arguments of the call.  Each call has a different args array, even if the args
contain the same values.

`release( args, isUndo )` - called to inform the limit that the resource is no
longer used.  Called when a call completes or when the call was not started because
another limit blocked it (`isUndo` is true).  The call arguments `args` is the
same args array object that was passed to `acquire`.


Change Log
----------

- 0.1.0 - first checkin, working but work still in progress
