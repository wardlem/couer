const Future = require('fluture');
const uuidv4 = require('uuidv4');
const debug = require('debug')('navel:Kernel');

const ServiceNameConflictError = require('./errors/ServiceNameConflictError');
const ServiceNotFoundError = require('./errors/ServiceNotFoundError');
const AccessDeniedError = require('./errors/AccessDeniedError');

const Service = require('./Service');

const wrapFuture = require('./utils/wrapFuture');
const loadConfig = require('./utils/loadConfig');
const resolvePath = require('./utils/resolvePath');

const noop = () => {};

const Kernel = Service.define('Kernel', {
    type: 'kernel',
    actions: {
        ['service:register'](data, source) {
            // TODO: validate the source

            const {service, force = false} = data;

            const id = uuidv4();

            if (service.name) {
                // If there is a service name conflict, we will, by default, return an error.
                // However, there are situations where you may want to replace an existing
                // service with a new one.  As such, we allow the service to be overridden
                // if the force flag is set to true.
                if (service.name && this.serviceNames.has(service.name)) {
                    if (force) {
                        return this['service:deregister']({id: service.name, force: true}, source)
                            .chain(() => {
                                return this['service:register'](data, source);
                            })
                        ;
                    } else {
                        return Future.reject(new ServiceNameConflictError(`Duplicate service name ${service.name} found.`, service.name));
                    }
                }

                this.serviceNames.set(service.name, id);
            }

            this.services.set(id, service);

            service.id = id;

            // Set the services outbox so it can communicate with other services through
            // the kernel.
            const outbox = this.createOutbox();
            service._outbox = outbox;

            // Inform the service that it has been registered.
            this.tell(id, 'registered', null);

            return Future.of(`Registered service ${service.id}.`);
        },
        ['service:deregister'](data, source) {
            // TODO: validate the source

            const {id} = data;

            return this.findService(id)
                .chain((service) => {
                    if (service.name) {
                        this.serviceNames.delete(service.name);
                    }

                    this.services.delete(service.id);
                    this.subscriptions = new Map(Array.from(this.subscription.entries()).map((entry) => {
                        return [
                            entry[0],
                            new Map(Array.from(entry[1].entries()).filter((channelEntry) => {
                                return channelEntry[1].subscriberId != service.id;
                            })),
                        ];
                    }));

                    // Inform the service that it is no longer registered.
                    this.tell(service.id, 'deregistered', null);

                    return Promise.resolve(`Unregistered service ${service.id}`);
                })
            ;
        },
        ['service:start']({service}) {
            return this.findService(service)
                .chain((service) => {
                    return this.ask(service.id, 'start');
                })
            ;
        },
        ['service:stop']({service, force = false}) {
            return this.findService(service)
                .chain((service) => {
                    return this.ask(service.id, 'stop', {force});
                })
            ;
        },
        ['service:restart']({service, force = false}) {
            return this.findService(service)
                .chain((service) => {
                    return this.ask(service.id, 'restart', {force});
                })
            ;
        },
        ['service:reconfigure']({service, config, force = false}) {
            return this.findService(service)
                .chain((service) => {
                    return this.ask(service.id, 'reconfigure', {force, config});
                })
            ;
        },
        ['service:describe']({service}) {
            return this.findService(service)
                .chain((service) => {
                    return this.ask(service.id, 'describe');
                })
            ;
        },
        ['service:startall']() {
            return this.seek('start');
        },
        ['service:stopall']({force = false}) {
            return this.seek('stop', {force});
        },
        ['service:restartall']({force = false}) {
            return this.seek('restart', {force});
        },
        ['service:describeall']() {
            return this.seek('describe');
        },
        ['subscription:create']() {

        },
        ['subscription:destroy']() {

        },
    },

    init() {
        this.services = new Map();
        this.serviceNames = new Map();
        this.subscriptions = new Map();
        this.configPath = null,
        this['service:register']({service: this}, this.source);

        process.title = `${this.name}`;

        debug(`set process title for ${process.pid} to ${process.title}`);
    },

    proto: {
        createOutbox() {
            const outbox = this.processMessage.bind(this);
            outbox.source = this.source;

            return outbox;
        },
        findService(identifier) {
            if (this.services.has(identifier)) {
                return Future.of(this.services.get(identifier));
            } else if (this.serviceNames.has(identifier)) {
                return this.findService(this.serviceNames.get(identifier));
            }

            return Future.reject(new ServiceNotFoundError(`Could not find a service with the identifier ${identifier}`, identifier));
        },
        hasService(identifier) {
            if (this.services.has(identifier)) {
                return true;
            } else if (this.serviceNames.has(identifier)) {
                return this.hasService(this.serviceNames.get(identifier));
            }

            return false;
        },
        respondingServices(what) {
            return Future.of(
                Array.from(this.services.values()).filter((service) => service.respondsTo(what))
            );
        },
        processMessage(message, expectResponse = false) {
            const {
                source,
                destination = null,
                channel = null,
                action = null,
                data = null,
            } = message;

            // We do not allow messages being sent from services that are not
            // registered with the kernel.
            if (!source || !this.services.has(source.id)) {
                return AccessDeniedError('The service attempting to perform this action is not a registered service.');
            }

            // If a message has no destination, but has a channel, we are sending a
            // a broadcast.  If the destination is the special wildcard '*' we are
            // sending a discovery, which is sent to all services that respond to the
            // the action. Otherwise, we are sending a point-to-point (service-to-service)
            // message.
            if (destination == null && channel) {
                return this.sendBroadcast(channel, data, source);
            } else if (destination === '*') {
                return this.sendDiscovery(action, data, source, expectResponse);
            } else {
                return this.sendPointToPoint(destination, action, data, source, expectResponse);
            }
        },
        sendBroadcast(channel, data, source) {
            if (!this.subscriptions.has(channel)) {
                return Future.of(null);
            }

            const subscriptions = Array.from(this.subscriptions.get(channel).values()).filter((sub) => {
                return sub.filter(data);
            });

            const futures = subscriptions.map((sub) => {
                return wrapFuture(sub.action(data, source));
            });

            // We don't return the broadcast future since we don't want to bubble
            // any errors back up to the caller.
            const broadcast = Future.parallel(5, futures);

            broadcast.fork(noop, noop);

            return Future.of(null);
        },
        sendPointToPoint(destination, action, data, source, expectResponse) {
            return this.findService(destination)
                .chain((service) => {

                    // If a response is expected, we just send the message
                    // and wait for the future to resolve with the data.
                    // Otherwise we return early and send the message on to
                    // its destination, forcing the future to execute

                    // TODO: watchers and interceptors
                    let sendFuture = wrapFuture(service._inbox({
                        source,
                        action,
                        data,
                    }));

                    if (expectResponse) {
                        return sendFuture;
                    } else {
                        sendFuture.fork(noop, noop);
                        return Future.of(null);
                    }
                })
            ;
        },
        sendDiscovery(action, data, source, expectResponse) {
            return this.respondingServices(action)
                .chain((services) => {

                    // If a response is expected, we just send the message
                    // and wait for the future to resolve with the data.
                    // Otherwise, we return early and send the message on to
                    // its destination, forcing the future to execute

                    // TODO: watchers and interceptors
                    const futures =  services.map((service) => wrapFuture(service._inbox({
                        source,
                        action,
                        data,
                    })));

                    const sendFuture = Future.parallel(10, futures);

                    if (expectResponse) {
                        return sendFuture;
                    } else {
                        sendFuture.fork(noop, noop);
                        return Future.of(null);
                    }
                })
            ;
        },

        // Build services from a configuration file.
        // Currently, only yaml is supported, but other file types may be added in the
        // future (json, toml, js).
        boot(configPath) {
            debug('booting', configPath);
            return loadConfig(configPath)
                .chain((config) => {
                    const serviceDefs = config.services;

                    const registerFutures = Object.keys(serviceDefs).map((serviceName) => {
                        const serviceDef = serviceDefs[serviceName];
                        const {
                            path,
                            options = {},
                        } = serviceDef;

                        debug('service def: ', serviceName, serviceDef);

                        if (!path) {
                            // TODO: this should probably error
                            return Future.of(null);
                        }

                        const requirePath = resolvePath(path);

                        const Service = require(requirePath);
                        const service = Service(serviceName);

                        return this['service:register']({service}, this.source)
                            .chain(() => this.ask(service.id, 'configure', options))
                        ;
                    });

                    return Future.parallel(10, registerFutures);
                })
                .map(() => this)
            ;
        },

        run() {
            debug('starting all services');
            return this['service:startall']({}, this.source);
        },

        halt() {
            return this['service:stopall']({}, this.source);
        },
    },
});


module.exports = Kernel;
