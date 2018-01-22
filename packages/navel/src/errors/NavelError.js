const merge = require('merge-descriptors');

const createNamedFunction = require('../utils/createNamedFunction');

function NavelError(message) {
    const err = {
        name: 'NavelError',
        message,
        __proto__: NavelError.prototype,
        get [Symbol.toStringTag]() { return NavelError.name; },
        constructor: NavelError,
    };

    Error.captureStackTrace(err);

    return err;
}

NavelError.prototype = Object.create(Error.prototype);
merge(NavelError.prototype, {
    toString() {
        return `${this[Symbol.toStringTag]}: ${this.message || ''}`;
    },
});

NavelError.define = function extend(name, properties = [], proto = {}) {
    let CustomError;

    const constr = function(...args) {
        const err = {
            name,
            __proto__: CustomError.prototype,
            get [Symbol.toStringTag]() { return name; },
            constructor: CustomError,
        };

        Error.captureStackTrace(err);

        properties.forEach((prop, ind) => {
            Object.defineProperty(err, prop, {
                get: () => args[ind],
            });
        });

        // remove unnecessary lines and clean up error title
        err.stack = [err.toString()].concat(err.stack.split('\n').slice(3)).join('\n');

        return err;
    };

    CustomError = createNamedFunction(name, constr, properties);
    CustomError.prototype = Object.create(NavelError.prototype);

    merge(CustomError.prototype, proto);

    return CustomError;
};

module.exports = NavelError;
