// based on https://github.com/expressjs/body-parser/blob/master/lib/read.js

const zlib = require('zlib');
const http = require('http');
const R = require('ramda');
const Future = require('fluture');
const getBody = require('raw-body');
const contentType = require('content-type');

const createHttpError = require('../errors/createHttpError');

module.exports = function readBody(req, res, options) {
    return contentStream(req, res, options.inflate).chain((stream) => {

        const length = stream instanceof http.IncomingMessage ? req.header('content-length').value : stream.length;

        const encoding = options.raw
            ? null
            : (contentType.parse(req.original).parameters.charset || 'utf-8')
        ;

        const opts = R.merge({encoding, length}, options);

        return Future.node((done) => getBody(stream, opts, done))
            .mapRej(
                (err) => {
                    // consume entire stream
                    stream.resume();

                    return err.type === 'encoding.unsupported'
                        ? createHttpError(415, 'unsupported content encoding "' + encoding + '"', {encoding})
                        : createHttpError(err.status, err.message, err);
                }
            )
        ;

    });
};

function contentStream(req, res, inflate) {
    const encoding = (req.header('content-encoding') || 'identity').toLowerCase();

    if (inflate === false && encoding !== 'identity') {
        return Future.reject(createHttpError(415, 'content encoding not supported'));
    }

    let stream;
    switch (encoding) {
        case 'deflate':
            stream = zlib.createInflate();
            req.original.pipe(stream);
            return Future.of(stream);
        case 'gzip':
            stream = zlib.createGunzip();
            req.original.pipe(stream);
            return Future.of(stream);
        case 'identity':
            stream = req.original;
            if (!stream) {
                return;
            }
            return Future.of(stream);
        default:
            return Future.reject(createHttpError(415, 'unsupported content encoding "' + encoding + '"', {encoding}));
    }
}
