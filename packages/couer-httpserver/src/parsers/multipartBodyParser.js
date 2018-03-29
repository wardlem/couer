const os = require('os');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const R = require('ramda');
const Future = require('fluture');
const debug = require('debug')('core:multipartBodyParser');
const BusBoy = require('busboy');
const appendField = require('append-field');
const _mkdirp = require('mkdirp');

const {Pipeline, Continuation} = require('couer-router');
const createHttpError = require('../errors/createHttpError');

module.exports = function multipartBodyParser(options = {}) {
    const opts = R.merge({
        dest: os.tmpdir(),
        storage: null,
        filter: R.always(Future.of(true)),
        limits: {},
        type: 'multipart/form-data',
    }, options);

    opts.limits = R.merge(opts.limits, {
        fieldNameSize: 100,
        fieldSize: '1MB',
        fields: Infinity,
        fileSize: Infinity,
        files: Infinity,
        parts: Infinity,
        headerPairs: 2000,
    });

    const makeFileName = () => Future.node(done => crypto.pseudoRandomBytes(16, done)).map(raw => raw.toString('hex'));
    const mkdirp = (dirname) => Future.node(done => _mkdirp(dirname, done));

    const writeFileToDisk = (fileStream) => {
        debug('writing file');
        return makeFileName().chain((filename) => {
            return mkdirp(opts.dest).chain(() => Future((reject, resolve) => {
                const fullPath = path.resolve(opts.dest, filename);
                const outStream = fs.createWriteStream(fullPath);
                fileStream.pipe(outStream);
                outStream.on('error', reject);
                fileStream.on('error', reject);
                fileStream.on('limit', reject);
                outStream.on('finish', () => {
                    debug('wrote file to %s', fullPath);
                    resolve(fullPath);
                });
            }));
        });
    };

    return function parseMultipartBody(req, res) {
        if (!req.hasBody || req.bodyRead || !req.is(opts.type)) {
            return Pipeline.next(req, res);
        }

        debug('parse multipart body');
        return Future((reject, resolve) => {
            try {
                resolve(new BusBoy(R.assoc('headers', req.headers, opts)));
            } catch (e) {
                reject(e);
            }
        }).chain((busboy) => Future((reject, resolve) => {
            const fields = {};
            const files = {};

            let pendingWrites = 0;
            let finished = false;
            let rejected = false;

            const error = (code, message) => {
                debug('errored %s: %s', code, message);
                if (!rejected) {
                    rejected = true;
                    reject(createHttpError(code, message));
                }
            };

            const done = () => {
                debug('checking if done');
                if (pendingWrites === 0 && finished && !rejected) {
                    let newReq = req.update({
                        files: files,
                        body: fields,
                    });
                    newReq.bodyRead = true;
                    debug('done');
                    resolve(Continuation.Next(newReq, res));
                }
            };

            busboy.on('field', (fieldName, value, fieldNameTruncated, valueTruncated) => {
                debug(`field ${fieldName}: %O`, value);
                if (fieldNameTruncated) {
                    return error(400, 'Field name too long');
                }
                if (valueTruncated) {
                    return error(400, `Value for field ${fieldName} is too long`);
                }

                appendField(fields, fieldName, value);
            });

            busboy.on('file', function(fieldname, fileStream, filename, encoding, mimetype) {
                debug(`file ${fieldname}: ${filename}`);
                if (!filename) {
                    return fileStream.resume();
                }
                pendingWrites += 1;

                let file = {
                    fieldname,
                    filename,
                    encoding,
                    mimetype,
                };

                opts.filter(req, file).chain((shouldSave) => {
                    if (!shouldSave) {
                        pendingWrites -= 1;
                        fileStream.resume();
                        done();
                        return Future.of(false);
                    }
                    return writeFileToDisk(fileStream);
                }).fork((err) => {
                    pendingWrites -= 1;
                    fileStream.resume();
                    error(400, err.message);
                    done();
                }, (path) => {
                    pendingWrites -= 1;
                    file.path = path;
                    appendField(files, fieldname, file);
                    done();
                });
            });

            busboy.on('error', (err) => error(400, err.message));
            busboy.on('partsLimit', () => error(400, 'Too many parts'));
            busboy.on('filesLimit', () => error(400, 'Too many files'));
            busboy.on('fieldsLimit', () => error(400, 'Too many fields'));
            busboy.on('finish', () => {
                finished = true;
                done();
            });

            let _nodereq = req.original;
            _nodereq.pipe(busboy);
        }));
    };
};
