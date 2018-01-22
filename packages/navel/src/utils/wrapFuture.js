const Future = require('fluture');
const R = require('ramda');

function wrapFuture(value) {
    if (Future.isFuture(value)) {
        return value;
    } else if (R.is(Error, value)) {
        return Future.reject(value);
    }

    return Future.of(value);
}

module.exports = wrapFuture;
