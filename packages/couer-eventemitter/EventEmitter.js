const R = require('ramda');
const Future = require('fluture');

const listeners$ = Symbol('listeners');

module.exports = function(target) {
    target[listeners$] = {};

    target.on = function(eventName, listener) {
        target[listeners$][eventName] = target[listeners$][eventName] || [];
        target[listeners$][eventName] = target[listeners$][eventName].concat([listener]);
    };

    target.prependOn = function(eventName, listener) {
        target[listeners$][eventName] = target[listeners$][eventName] || [];
        target[listeners$][eventName] = [listener].concat(target[listeners$][eventName]);
    };

    target.once = function(eventName, _listener) {
        // this is to avoid mutating the original listener
        let listener = function() {
            return _listener.apply(null, arguments);
        };
        listener.once = true;
        listener.original = _listener;
        target.on(eventName, listener);
    };

    target.prependOnce = function(eventName, _listener) {
        // this is to avoid mutating the original listener
        let listener = function() {
            _listener.apply(target, arguments);
        };
        listener.once = true;
        listener.original = _listener;
        target.prependOn(eventName, listener);
    };

    target.removeAllListeners = function(eventName) {
        target[listeners$][eventName] = [];
    };

    target.removeListener = function(eventName, _listener) {
        if (!target[listeners$][eventName]) {
            return;
        }

        let found = false;
        target[listeners$][eventName] = target[listeners$][eventName].filter(listener => {
            if (found) {
                return;
            }
            found = (listener === _listener) || (listener.original === _listener);
            return !found;
        });
    };

    target.emit = R.curry(function(eventName, data) {
        const listeners = (target[listeners$][eventName] || []).slice();
        const done = (result) => {
            target[listeners$][eventName] = R.filter(listener => {
                if (listener.once && listener.ran) {
                    return false;
                }

                return true;
            }, listeners);

            return result;
        };

        let task = R.reduce((task, listener) => {
            return task.chain((data) => {
                if (listener.once) {
                    if (listener.ran) {
                        return Future.of(data);
                    } else {
                        listener.ran = true;
                    }
                }

                return listener(data);
            });
        }, Future.of(data), listeners).bimap(done, done);

        return task;
    });
};
