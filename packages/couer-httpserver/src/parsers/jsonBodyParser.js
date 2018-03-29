const bytes = require('bytes');
const Task = require('fluture');
const R = require('ramda');
const debug = require('debug')('core:jsonBodyParser');

const Pipeline = require('../router/Pipeline');

const readBody = require('./readBody');
const createHttpError = require('../errors/createHttpError');

module.exports = function jsonBodyParser(options = {}) {
    const opts = R.merge({
        inflate: true,
        limit: '100kb',
        strict: true,
        type: 'application/json',
    }, options);

    if (R.is(String, opts.limit)) {
        opts.limit = bytes.parse(opts.limit);
    }

    const parse = R.curry((req, res, body) => {
        if (body.length === 0) {
            if (opts.strict) {
                return Task.reject(createHttpError(400, 'JSON body cannot be empty'));
            }
            return Task.of({});
        }

        if (opts.strict && !R.contains(R.head(body), ['[', '{'])) {
            return Task.reject(
                createHttpError(400, `Unexpected token ${R.head(body)} in JSON body at position 0`)
            );
        }

        try {
            let parsed = JSON.parse(body, R.is(Function, opts.reviver) ? opts.reviver : undefined);
            if (!R.is(Object, parsed)) {
                // only if strict == false
                parsed = {_value: parsed};
            }
            return Task.of(parsed);
        } catch (e) {
            return Task.reject(createHttpError(400, `Error parsing JSON: ${e.message}`, {original: e}));
        }
    });

    return function parseJsonBody(req, res) {
        if (!req.hasbody || req.bodyRead || !req.is(opts.type)) {
            return Pipeline.next(req, res);
        }

        return readBody(req, res, parse(req, res), opts)
            .chain(parse(req, res))
            .chain((body) => {
                debug('body: %O', body);
                // debug('bodyread 1: ' + req.bodyRead);
                req.bodyRead = true;
                // debug('bodyread 2: ' + req.bodyRead);
                return Pipeline.next(
                    req.update({body}),
                    res
                );
            })
        ;
    };
};
