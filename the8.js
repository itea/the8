
(function (window, undefined) {
var fnindex = {},
    bee = {
        define: function (name, fn) {
            fnindex[name] = fn;
        },
        getfn: function (name) { return fnindex[name]; }
    };

var slicefn = Array.prototype.slice;

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

    function feed(fn, itr) {
        if (Object.prototype.toString.call(itr) === '[object Array]') itr = iterator(itr);
        return function () {
            var v = itr();
            if (v !== undefined) return fn(v);
        };
    }

    function repeat(fn, t, count, doneCallback) {
    var callback = new Callback(),
        h = window.setInterval(function () {
            if (count--) { return void fn(); }
            window.clearInterval(h);
            callback.resolve();
        }, t);
        doneCallback && callback.then(doneCallback);
        return {
            then: callback.then,

            repeat: function () {
            var args = getArgsArray(arguments);
                callback.then(function () {
                    repeat.apply(null, args);
                });
            }
        };
    }

    function rangeIterator(start, end, step) {
        var i = start, x, absStep = Math.abs(step);
        return function() {
            if (i === end) return undefined;
            else if (Math.abs((x = i) - end) < absStep) {return i = end; }
            i += step;
            return x;
        };
    }

    bee.define("iterator", iterator);
    bee.define("feed", feed);
    bee.define("repeat", repeat);
    bee.define("rangeIterator", rangeIterator);
    
    window.bee = bee;
}(window))

