const qs = require('qs');
const bytes = require('bytes');
const Future = require('fluture');
const R = require('ramda');
const debug = require('debug')('core:urlencodedBodyParser');
const {Pipeline} = require('couer-router');

const readBody = require('./readBody');
const createHttpError = require('../errors/createHttpError');

module.exports = function urlencodedBodyParser(options = {}) {
    const opts = R.merge({
        inflate: true,
        limit: '100kb',
        strict: true,
        type: 'application/x-www-form-urlencoded',
        parameterLimit: 1000,
    }, options);

    if (R.is(String, opts.limit)) {
        opts.limit = bytes.parse(opts.limit);
    }

    const parse = R.curry((req, res, body) => {
        let paramCount = parameterCount(body, opts.parameterLimit);
        if (paramCount.isNothing()) {
            return createHttpError(413, 'too many parameters');
        }

        const arrayLimit = Math.max(100, paramCount.value);

        return Future.of(qs.parse(body, {
            allowPrototypes: true,
            arrayLimit: arrayLimit,
            depth: Infinity,
            parameterLimit: opts.parameterLimit,
        }));
    });

    return function parseUrlencodedBody(req, res) {
        if (!req.hasbody || req.bodyRead || !req.is(opts.type)) {
            return Pipeline.next(req, res);
        }

        let charset = req.charset;
        // debug('charset', charset);
        if (!R.isNil(charset) && charset !== 'utf-8') {
            return Future.reject(
                createHttpError(415, `unsupported charset "${charset}"`)
            );
        }

        return readBody(req, res, parse(req, res), R.merge(opts, {charset}))
            .chain(parse(req, res))
            .chain((body) => {
                debug('read body');
                req.bodyRead = true;
                return Pipeline.next(
                    req.update({body}),
                    res
                );
            })
        ;
    };

    function parameterCount(body, limit) {
        var count = 0;
        var index = 0;

        while ((index = body.indexOf('&', index)) !== -1) {
            count += 1;
            index += 1;

            if (count === limit) {
                return undefined;
            }
        }

        return count;
    }

};
