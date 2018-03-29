const util = require('util');

const mergeDescriptors = require('merge-descriptors');

function Continuation(state, req, res) {
    return {
        get state() { return state; },
        get req() { return req; },
        get res() { return res; },
        __proto__: Continuation.prototype,
    };
}

const $$done = Continuation.$$done = Symbol('done');
const $$next = Continuation.$$next = Symbol('next');

mergeDescriptors(Continuation.prototype, {
    get isdone() { return this.state === $$done; },
    get isnext() { return this.state === $$next; },
    get [Symbol.toStringTag]() { return 'Continuation'; },
    inspect(depth, options) {
        if (depth < 0) { return options.stylize('[Continuation]', 'special'); }
        return options.stylize('Continuation', 'special') + ' ' + util.inspect({
            state: this.state,
            req: this.req,
            res: this.res,
        }, depth, options);
    },
});

Continuation.Done = function Done(req, res) {
    return Continuation($$done, req, res);
};

Continuation.Next = function Next(req, res) {
    return Continuation($$next, req, res);
};

module.exports = Continuation;
