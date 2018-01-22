const util = require('util');
const debug = require('debug')('couer:server:Pipeline');
const R = require('ramda');
const Future = require('fluture');
const mergeDescriptors = require('merge-descriptors');

const {Next, Done} = require('./Continuation');

function Pipeline(pipe) {
    if (Array.isArray(pipe)) {
        return Pipeline.build(pipe);
    }

    return {
        get pipe() { return pipe; },
        __proto__: Pipeline.prototype,
    };
}

Pipeline.build = function build(stages) {
    const pipe = R.reduceRight(foldPipeline, Future.of, stages);
    return Pipeline(pipe);
};

Pipeline.done = function done(req, res) {
    return Future.of(Done(req, res));
};

Pipeline.next = function next(req, res) {
    return Future.of(Next(req, res));
};

Pipeline.error = function error(error) {
    return Future.reject(error);
};

function foldPipeline(fn, next) {
    return function pipe(continuation) {
        return continuation.isdone
            ? Future.of(continuation)
            : fn(continuation.req, continuation.res).chain(next)
        ;
    };
}

mergeDescriptors(Pipeline.prototype, {
    join(r) {
        const l = this;
        return Pipeline(function pipe(continuation) {
            return l.pipe(continuation).chain((continuation) => {
                if (continuation.isdone) {
                    return Future.of(continuation);
                }

                return r.pipe(continuation);
            });
        });
    },

    resume(r) {
        const l = this;
        if (typeof r === 'function') {
            r = Pipeline.build([r]);
        }
        return Pipeline(function pipe(continuation) {
            return l.pipe(continuation).chain((continuation) => {
                if (continuation.isnext) {
                    return Future.of(continuation);
                }

                return r.pipe(Next(continuation.req, continuation.res));
            });
        });
    },

    recover(recovery) {
        const pipeline = this;
        return Pipeline(function pipe(continuation) {
            let {req, res} = continuation;
            return pipeline.pipe(continuation).chainRej((err) => {
                return recovery(err, req, res);
            });
        });
    },

    run(req, res) {
        return this.pipe(Next(req, res));
    },

    get [Symbol.toStringTag]() { return 'Pipeline'; },

    inspect(depth, options) {
        if (depth < 0) { return options.stylize('[Pipeline]', 'special'); }
        return options.stylize('Pipeline', 'special') + ' ' + util.inspect({
            pipe: this.pipe,
        }, depth, options);
    },
});

module.exports = Pipeline;
