qlimiter
========


Configurable, extensible multi-tenant nodejs function call rate limiter, for any
function taking a callback as the last argument.  Extendable with externally
written limits.

Quick Start
-----------

    var qlimiter = require('qlimiter');

    // rate limit sum() to no more than 5 calls per any 100 milliseconds
    var rateLimitedSum = qlimiter(sum, {maxPerInterval: 5, interval: 100});

    rateLimitedSum(1, 2, function(err, ret) {
        // ret => 3
    })

    function sum(a, b, cb) {
        var ret = a + b;
        cb(null, ret);
    }


Description
-----------

*Configurable* - can specify multiple constraints, all must be met else the
  call will be blocked.  Blocked calls are queued and are run later when the
  constraints are met.

*Extensible* - can use user-written constraints as the enforced limits, both
  in combination with built-in limits or standalone.

*Multi-Tenant* - the constraints can decide whether to throttle based on the call
  arguments.  Qlimiter will queue the call on different waiting lists depending on
  what limit they blocked on.

*Function Call* - can throttle any function with a callback as its last parameter,
  including but not limited to middleware steps.


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
the call to run now, any other value to block it until later.  Returned values other
than `true` are tags used to identify which resource to block on.
If blocked, must notify the
limiter when unblocked with the `onUnblock` method.  `onUnblock()` must be called
with a value matching one of the blocked-on tags.
Acquire is presented the
arguments of the call.  Each call has a different args array, even if the args
contain the same values.

`release( args, isUndo )` - called to inform the limit that the resource is no
longer used.  Called when a call completes or to undo an `acquire` if the call was
not started because another limit blocked it.  The `args` argument is the identical
object that was passed to `acquire`.


Change Log
----------

- 0.4.0 - change `onUnblock` argument from count to type
- 0.3.2 - unit tests
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
