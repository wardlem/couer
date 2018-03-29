const bytes = require('bytes');
const Future = require('fluture');
const R = require('ramda');
const debug = require('debug')('core:textBodyParser');

const Pipeline = require('../router/Pipeline');

const readBody = require('./readBody');

module.exports = function textBodyParser(options = {}) {
    const opts = R.merge({
        inflate: true,
        limit: '100kb',
        strict: true,
        type: 'text/plain',
        raw: true,
    }, options);

    if (R.is(String, opts.limit)) {
        opts.limit = bytes.parse(opts.limit);
    }

    const parse = R.curry((req, res, data) => Future.of({_value: String(data)}));

    return function parseTextBody(req, res) {
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
