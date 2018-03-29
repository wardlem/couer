const bytes = require('bytes');
const Future = require('fluture');
const R = require('ramda');
const debug = require('debug')('core:rawBodyParser');

const {Pipeline} = require('couer-router');
const readBody = require('./readBody');

module.exports = function rawBodyParser(options = {}) {
    const opts = R.merge({
        inflate: true,
        limit: '100kb',
        strict: true,
        type: 'application/octet-stream',
        raw: true,
    }, options);

    if (R.is(String, opts.limit)) {
        opts.limit = bytes.parse(opts.limit);
    }

    const parse = R.curry((req, res, data) => Future.of({_value: Buffer.from(data)}));

    return function parseRawBody(req, res) {
        if (!req.hasbody || req.bodyRead || !req.is(opts.type)) {
            return Pipeline.next(req, res);
        }

        return readBody(req, res, parse(req, res), opts)
            .chain(parse(req, res))
            .chain((body) => {
                req.bodyRead = true;
                return Pipeline.next(
                    req.update({body}),
                    res
                );
            })
        ;
    };
};
