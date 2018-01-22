const net = require('net');
const fs = require('fs');

const Future = require('fluture');
const R = require('ramda');
const debug = require('debug')('navel:IPCServer');

const Service = require('../Service');

const IPCServer = Service.define('IPCServer', {
    type: 'ipc',
    actions: {
        configure({listenat = `${process.pid}.ipc`, timeout = null}) {
            this.listenat = listenat;
            this.timeout = timeout;

            return 'configured';
        },
        start() {
            if (this.server) {
                debug('ipcserver is already running');
                return 'already running';
            }

            return this.removeExistingSocketFile()
                .chain(this.startServer.bind(this));

        },
        stop({force = false}) {
            if (!this.server) {
                debug('ipcserver is not currently running');
                return 'already stopped';
            }

            // TODO: require force to close open sockets
            for (const socket of this.sockets) {
                socket.end();
            }

            this.sockets.clear();
            return Future.node((done) => this.server.close(done))
                .chain(() => this.removeExistingSocketFile())
                .map(() => {
                    debug('ipcserver is no longer running');
                    this.server = null;
                    return 'stopped';
                })
            ;
        },
        status() {
            if (this.server) {
                if (this.server.listening) {
                    return 'listening';
                } else {
                    return 'offline';
                }
            } else {
                return 'stopped';
            }
        },
    },

    init() {
        this.server = null;
        this.listenat = null;
        this.timeout = null;
        this.sockets = new Set();
    },

    proto: {
        handleMessage(socket, message) {
            try {
                message = JSON.parse(message);
            } catch (e) {
                debug('message was not valid json');
                return socket.write(`${this.formatError(new Error(''), message.ref)}\r\n`);
            }

            debug('message', message);

            switch (message.method) {
                case 'ask':
                    return this.handleAsk(socket, message).fork(debug, debug);
                case 'tell':
                    return this.handleTell(socket, message).fork(debug, debug);
                default:
                    return socket.write(`${this.formatError(new Error(''), message.ref)}\r\n`);
            }
        },
        removeExistingSocketFile() {
            const {listenat} = this;

            if (typeof listenat !== 'string') {
                return Future.of('ok');
            }

            debug(`checking for existing socket file at ${this.listenat}`);
            return Future.node((done) => fs.lstat('myfile', done))
                .chain((stat) => {
                    debug('socket file exists...removing it');
                    return Future.node((done) => fs.unlink(listenat, done));
                })
                .chainRej((err) => {
                    if (err.code === 'ENOENT') {
                        debug('socket file does not exist');
                        return Future.of('ok');
                    }

                    debug('could not check if file exists', err);
                    return Future.reject(err);
                })
            ;
        },
        startServer() {
            debug(`starting ipc server at ${this.listenat}`);

            const server = net.createServer();
            server.on('connection', (socket) => {
                this.sockets.add(socket);
                debug('got a connection', socket.address());

                socket.setEncoding('utf8');

                if (typeof this.timeout === 'number') {
                    socket.setTimeout(this.timeout);
                }

                socket.setKeepAlive(true);

                socket.on('close', (hadError) => {
                    this.sockets.delete(socket);
                    debug(`socket closed ${hadError ? 'with' : 'without'} error`);
                });

                socket.on('end', () => {
                    debug('socket connection ended by client');
                });

                let buffer = '';
                socket.on('data', (data) => {
                    debug(`${data.length} bytes received`);

                    buffer += data;

                    if (buffer.indexOf('\r\n') > -1) {
                        const messages = buffer.split('\r\n');

                        const init = R.init(messages);
                        const last = R.last(messages);

                        init.forEach((message) => {
                            this.handleMessage(socket, message);
                        });

                        buffer = last;
                    }
                });

                socket.on('timeout', () => {
                    debug('socket connection timed out');
                    socket.end();
                });
            });

            return Future.node((done) => server.listen(this.listenat, done))
                .map(() => {
                    this.server = server;

                    debug('ipcserver is running');
                    return 'started';
                })
            ;
        },
        handleAsk(socket, {destination, action, ref, data}) {
            return this.ask(destination, action, data)
                .map((result) => this.formatMessage(result, ref))
                .chainRej((err) => Future.of(this.formatErrorMessage(err, ref)))
                .map((out) => {
                    socket.write(`${JSON.stringify(out)}\r\n`);

                    return 'ok';
                })
            ;
        },
        handleTell(socket, {destination, action, ref, data}) {
            return this.tell(destination, action, data)
                .map((result) => this.formatMessage(result, ref))
                .chainRej((err) => Future.of(this.formatErrorMessage(err, ref)))
                .map((out) => {
                    socket.write(`${JSON.stringify(out)}\r\n`);

                    return 'ok';
                })
            ;
        },
        formatMessage(data, ref, error = false) {
            return {
                data,
                ref,
                error,
            };
        },
        formatErrorMessage(error, ref) {
            return this.formatMessage(error.message, ref, true);
        },
    },
});

module.exports = IPCServer;
