
(function (window, undefined) {
var fnindex = {},
    bee = {
        define: function (name, fn) {
            fnindex[name] = fn;
        },
        require: function (name) { return fnindex[name]; }
    };

var slicefn = Array.prototype.slice;

    /* use faster timeouts fn: http://dbaron.org/log/20100309-faster-timeouts */
var defer = (function () {
    var q = [];
        window.addEventListener("message", function (event) {
            if ("*defer*" !== event.data) return;
            while( q.length > 0 ) q.shift()();
        }, true);

        return function (cbk, t) {
            t ?  window.setTimeout(cbk, t) :
                (q.push(cbk), window.postMessage("*defer*", "*") );
        };
    }());

    /*  Make arguments to an array or use the only array parameter */
    function getArgsArray (args, i) {
        i = i || 0;
        return (args.length === 1 && args[0] instanceof Array) ? args[0].slice(i)
            : slicefn.call(args, i);
    }

    function Callback() {
    var callbacks = [];

        this.then = function (fn) {
            callbacks.push(fn);
        };

        this.resolve = function () {
        var args = getArgsArray(arguments), fn;
            while (fn = callbacks.shift() ) fn.apply(null, args);
        };
    }

    function iterator(list) {
        list = list.slice();
        return function () { return list.shift(); };
    }

    function feeding(fn, itr) {
        if (Object.prototype.toString.call(itr) === "[object Array]") itr = iterator(itr);
        return function () {
            var v = itr();
            if (v !== undefined) return fn(v);
        };
    }

    function repeat(fn, t, count, delay) {
    var callback = new Callback(),
        run = function () {
        var h = window.setInterval(function () {
                  if (count--) { return void fn(); }
                  window.clearInterval(h);
                  callback.resolve();
              }, t);
        };
        
        return {
            run: (delay === "delay") ? run : void run(),
              
            then: callback.then,

            repeat: function (fn, t, count) {
            var next = repeat(fn, t, count, "delay");
                callback.then(next.run);
                return next;
            }            
        };
    }

    function rangeIterator(start, end, step) {
        var i = start, x, absStep = Math.abs(step);
        return function() {
            if (i === undefined) return undefined;
            if (Math.abs((x = i) - end) < absStep) { i = undefined; return end; }
            i += step;
            return x;
        };
    }

    // pub/sub pattern
    function Emiter () {
    var fireNow = function (fn) { fn(); },

        carryArgs = slicefn.call(arguments),

        handlersIndex = {},

        fire = function (eventType, args, fireFn) {
        var handlers = handlersIndex[ eventType ];

            if ( !handlers || handlers.length === 0) return;

            fireFn(function () {
            var i = 0, target = null;

                for (; i < handlers.length; i++) {
                    (handlers[i] || noop).apply(target, args);
                }
            });
        },

        emit = function (eventType) {
        var args = carryArgs.concat( slicefn.call(arguments, 1) );
            fire(eventType, args, defer);
        },
        
        instance = this == window ? emit : this;

        instance.emit = emit;

        instance.fire = function (eventType) {
        var args = carryArgs.concat( slicefn.call(arguments, 1) );
            fire(eventType, args, fireNow);
        };

        instance.addEventListener = function (eventType, callback, prepend) {
        var handlers = handlersIndex[ eventType ];
            if ( !handlers ) handlers = handlersIndex[ eventType ] = [];
            prepend ? handlers.unshift(callback) : handlers.push(callback);
        };

        instance.removeEventListener = function (eventType, callback) {
        var handlers = handlersIndex[ eventType ],
            i = (handlers && handlers.indexOf( callback ));
            if (typeof i === "number" && i > -1) handlers.splice(i, 1);
        };

        return instance;
    }

    bee.define("defer", defer);
    bee.define("iterator", iterator);
    bee.define("feeding", feeding);
    bee.define("repeat", repeat);
    bee.define("rangeIterator", rangeIterator);
    bee.define("Callback", Callback);
    bee.define("Emiter", Emiter);
    
    window.bee = bee;
}(window))

