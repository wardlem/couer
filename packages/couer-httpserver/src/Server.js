const http = require('http');

const navel = require('navel');
const {Service, Future} = navel;
const {resolvePath} = navel.utils;

const R = require('ramda');
const onFinished = require('on-finished');
const debug = require('debug')('couer:Server');
const createHttpError = require('http-errors');
const {HttpError} = createHttpError;

const {Request, Response} = require('./http');
const {done} = require('couer-router').Pipeline;

const CouerHttpServer = Service.define('CouerHttpServer', {
    type: 'server',
    init() {
        debug('initializing couer http server');
        this.pipeline = null;
        this.port = 4000;
        this.httpserver = null;
    },
    actions: {
        configure(options) {

            this.pipeline = options.pipeline;
            this.port = options.port || 4000;

            return 'ok';
        },
        start() {
            if (!this.pipeline) {
                return Future.reject(new Error('A path to the server\'s pipeline must be specified'));
            }

            const pipelinePath = resolvePath(this.pipeline);

            let pipeline;
            try {
                pipeline = require(pipelinePath);
            } catch (e) {
                return Future.reject(e);
            }

            debug(`starting server ${this.name} at port ${this.port}`);
            return this.run(this.port, pipeline).map((server) => {
                debug(`server ${this.name} is running...`);
                this.server = server;
                return 'ok';
            });
        },
        stop() {
            debug(`stopping server ${this.name}`);
            if (!this.server) {
                debug(`server ${this.name} is already stopped`);
                return Future.of('already stopped');
            }
            return Future.node((done) => this.server.close(done)).map(() => debug(`server ${this.name} is stopped`) || 'ok');
        },
    },
    proto: {
        run(port, pipeline) {
            return Future((reject, resolve) => {
                const server = http.createServer(this.handle(pipeline));
                let listening = false;

                server.listen(port, (err, res) => {
                    if (!listening) {
                        listening = true;

                        if (err) {
                            server.close();
                            return reject(err);
                        }

                        resolve(server);
                    }
                });
            });
        },
        handle(pipeline) {
            return (nodereq, noderes) => {
                debug(`server ${this.name} received request`);
                const req = Request.fromNodeRequest(nodereq).update({
                    data: {
                        __requestStart: Date.now(), // TODO: change to higher precision time format
                    },
                });
                const res = Response.fromNodeResponse(noderes);

                pipeline.run(req, res).chain(checkFallthrough).chainRej((err) => {
                    debug('Error occurred while processing request: %O', err);
                    return default500(err, req, res);
                }).chain(writeResponse).fork((err) => {
                    debug('Error occurred while processing request, response not sent: %O', err);
                }, (result) => {
                    debug('Request complete');
                });
            };
        },
    },

});

function checkFallthrough(continuation) {
    if (continuation.isnext) {
        debug('Request fell through pipeline: %s %s', continuation.req.method, continuation.req.url);
        return default404(continuation.req, continuation.res);
    }

    return Future.of(continuation);
}

function default404(req, res) {
    return done(
        req,
        res.status(404).text(`404: ${req.method.toUpperCase()} ${req.url} does not exist on this server.`)
    );
}

function default500(err, req, res) {
    if (err instanceof HttpError) {
        return done(
            req,
            res.addHeaders(err.headers || {}).status(err.status).text(`${err.status}: ${err.message}`)
        );
    } else {
        return done(
            req,
            res.status(500).text('500: Internal Server Error')
        );
    }
}

function writeResponse(continuation) {
    const {req, res} = continuation;
    const {original} = res;

    let onHeadersTask = R.reduce((task, fn) => {
        return task.chain(fn);
    }, Future.of([req, res]), R.path(['data', '__on', 'header'], res) || []);

    let headersTask = onHeadersTask.map(([req, res]) => {
        const {headers, body} = res.writeCookies();
        Object.keys(headers).forEach((name) => {
            const value = headers[name];
            original.setHeader(name, value);
        });

        if (!(body instanceof Uint8Array)) {
            return [req, res];
        }

        if (res.statusMessage != null) {
            original.writeHead(res.statusCode, res.statusMessage);
        } else {
            original.writeHead(res.statusCode);
        }
        return [req, res];

    });

    let onBodyTask = headersTask.chain(([req, res]) => {
        return R.reduce((task, fn) => {
            return task.chain(fn);
        }, Future.of([req, res]), R.path(['data', '__on', 'body'], res) || []);
    });

    function printRequestCompleteMessage(req) {
        let elapsed = '';
        if (req.data.__requestStart) {
            elapsed = ` in ${Date.now() - req.data.__requestStart}ms`;
        }
        debug(`Successfully sent ${res.statusCode} response for ${req.method} ${req.url}${elapsed}`);
    }

    let bodyTask = onBodyTask.chain(([req, res]) => {
        const {body} = res;

        return Future((reject, resolve) => {
            if (R.is(Buffer, body)) {
                original.end(req.method.toUpperCase() === 'HEAD' ? Buffer.from([]) : body, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        printRequestCompleteMessage(req);
                        resolve([req, res]);
                    }
                });
            } else {
                // this is a stream
                const file = res.body;
                let done = false;
                let streaming = undefined;

                const ondirectory = () => {
                    if (done) {
                        return;
                    }
                    done = true;
                    // TODO: fix this
                    reject(createHttpError(404, '404: Not Found'));
                };

                const onaborted = () => {
                    if (done) {
                        return;
                    }
                    done = true;

                    reject(createHttpError(400, '400: Aborted'));
                };

                const onerror = (err) => {
                    if (done) {
                        return;
                    }
                    done = true;

                    const status = err.statusCode || 500;
                    if (err.code === 'ENOENT') {
                        return reject(createHttpError(status, `${status}: File Not Found`));
                    }
                    reject(createHttpError(status, `${status}: ${err.message}`));
                };

                const onend = () => {
                    if (done) {
                        return;
                    }
                    done = true;
                    printRequestCompleteMessage(req);
                    resolve([req, res]);
                };

                const onfile = () => {
                    streaming = false;
                };

                function onfinish(err) {
                    if (err && err.code === 'ECONNRESET') {
                        return onaborted();
                    }
                    if (err) {
                        return onerror(err);
                    }
                    if (done) {
                        return;
                    }

                    setImmediate(() => {
                        if (streaming !== false && !done) {
                            onaborted();
                            return;
                        }

                        if (done) {
                            return;
                        }
                        done = true;
                        printRequestCompleteMessage(req);
                        resolve([req, res]);
                    });

                }

                const onstream = () => {
                    streaming = true;
                };

                file.on('directory', ondirectory);
                file.on('end', onend);
                file.on('error', onerror);
                file.on('file', onfile);
                file.on('stream', onstream);
                onFinished(original, onfinish);

                file.pipe(original);
            }
        });
    });

    return bodyTask.mapRej((err) => {
        original.writeHead(err.statusCode || 500);
        original.end(err && err.message);
        return err;
    });
}

module.exports = CouerHttpServer;
