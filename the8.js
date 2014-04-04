
(function (window, undefined) {
var fnindex = {},
    define = function (name, fn) {
        fnindex[name] = fn;
    },
    require = function (name) { return fnindex[name]; },
    bee = {
        define: define,
        require: require,
        equip: function (names) {
        var names = names.split(/\s+/), name;
            while( name = names.shift() ) this[name] = require(name);
        }
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

    function getArgs(args, i) {
        return slicefn.call(args, i || 0);
    }

    function currying(fn) {
    var carryArgs = getArgs(arguments, 1);
        return function () {
            return fn.apply(this, carryArgs.concat( getArgs(arguments) ) );
        };
    }

    function Callback() {
    var callbacks = [];

        this.then = function (fn) {
            callbacks.push(fn);
        };

        this.resolve = function () {
        var args = getArgs(arguments), fn;
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

    function loadjs (state, file) {
    var callback = new Callback();

        if (state[file]) {
            defer(callback.resolve);
            return callback;
        }

        script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = script._file = file;
        script.onload = script.onreadystatechange = function() {
            if(!this.readyState ||
                (this.readyState == "loaded" && this.lastReadyState == "loading") || this.readyState == "complete") {
                state[this._file] = true;
                callback.resolve();
            }
            this.lastReadyState = this.readyState;
        };
        document.body.appendChild(script);
        return callback;
    }

    // pub/sub pattern
    function Emiter () {
    var fireNow = function (fn) { fn(); },

        carryArgs = slicefn.call(arguments),

        handlersIndex = {},

        fire = function (fireFn, eventType) {
        var handlers = handlersIndex[ eventType ],
            args = getArgs(arguments, 2);

            if ( !handlers || handlers.length === 0) return;

            fireFn(function () {
            var i = 0, target = null;

                for (; i < handlers.length; i++) {
                    (handlers[i] || noop).apply(target, args);
                }
            });
        },
        
        instance = this == window ? {} : this;

        instance.emit = currying(fire, defer);

        instance.fire = currying(fire, fireNow);

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

    /* usage: mix ( initfn, ["methoda", fna, "methodb", fnb, ...], [...], ... ); */
    function mix (initfn) {
    var methodsdefs = getArgs(arguments, 1);

    return function () {
        var args = getArgs(arguments),
            instance = this,
            carryArgs = initfn.apply(instance, args);

            methodsdefs.forEach(function (methods) {
                var name, fn, i = 0, len = methods.length;
                for (; i < len; i++) {
                    name = methods[i];
                    fn = methods[++i];

                    instance[name] = carryArgs.length === 0 ? fn : currying.apply(null, [fn].concat(carryArgs) );
                }
            });
        };
    }

    define("defer", defer);
    define("currying", currying);
    define("iterator", iterator);
    define("feeding", feeding);
    define("repeat", repeat);
    define("rangeIterator", rangeIterator);
    define("Callback", Callback);
    define("Emiter", Emiter);
    define("loadjs", currying(loadjs, {}));
    define("mix", mix);
    
    window.bee = bee;
}(window))

