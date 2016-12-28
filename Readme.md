qlimiter
========


Fast configurable call rate limiter, for any function taking a callback
as the last argument.  Extendable with externally written limits.

Quick Start
-----------

    var qlimiter = require('qlimiter');

    // rate limit func to no more than 5 calls per 100 milliseconds
    var rateLimitedFunc = qlimiter(func, {maxPerInterval: 5, interval: 100});

    rateLimitedFunc(1, 2, function(err, ret) {
        // ret => 3
    })

    function func(a, b, cb) {
        var ret = a + b;
        cb(null, ret);
    }


Benchmark
---------

100k 2-arg `maxConcurrent` calls in 47 ms (2 concurrent)

100k 2-arg `maxPerInterval` calls in 152 ms (max 1000 during any 1 ms)


Api
---

### qlimiter( func, [options] )

Return a function that invokes `func` when all rate limit criteria are met,
else queues the call.  Calls are run in order, queued calls first, though they
may complete out of order.  The function func must always take a callback as
its last argument.

Options:
- `limits` - array of custom limits to test
- `maxConcurrent` - limit number of calls running concurrently
- `minInterval` - minimum calls spacing, in milliseconds
- `maxPerInterval` - limit calls per rolling time `interval` milliseconds
- `interval` - rolling time interval, default 1000 milliseconds

Extending
---------

Custom limits can be plugged into the qlimiter limits stack.
Custom limits are tested before built-in limits.

A custom limit inherits from `qlimiter.Limit` or must implements methods

`setOnUnblock( onUnblock )` - function to notify the limiter that the resource
usage has dropped below the limit threshold.

`acquire( args )` - called to test whether a call can run.  Return true to allow
the call to run now, false to block it until later.  If blocked, must notify the
limiter when unblocked with the `onUnblock` method.  Acquire is presented the
arguments of the call.  Each call has a different args array, even if the args
contain the same values.

`release( args, isUndo )` - called to inform the limit that the resource is no
longer used.  Called when a call completes or to undo an `acquire` if the call was
not started because another limit blocked it.  The `args` argument is the identical
object that was passed to `acquire`.


Change Log
----------

- 0.3.1 - unit tests
- 0.3.0 - maxConcurrent, minInterval, maxPerInterval
- 0.1.0 - first checkin, working but work still in progress


Todo
----

- `maxWaitingCount` - cap wait queue
- `maxWaitingTime` - max ms to wait
- `backoffTime` -
- `backoffMultiplier` -


Related Work
------------

- `limiter` -
- `function-rate-limit` -
- `simple-rate-limiter` -
