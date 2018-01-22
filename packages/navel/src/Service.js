const merge = require('merge-descriptors');
const Future = require('fluture');
const R = require('ramda');

const ActionNotFoundError = require('./errors/ActionNotFoundError');

const createNamedFunction = require('./utils/createNamedFunction');
const wrapFuture = require('./utils/wrapFuture');

const actions$ = Symbol('actions');

const defaultActions = [
    'registered',
    'deregistered',
    'configure',
    'reconfigure',
    'start',
    'stop',
    'restart',
    'describe',
    'status',
];

function Service(type, name) {
    this.type = type;
    this.name = name;

    this._inbox = this._inbox.bind(this);
    this._outbox = null; // will be set to a unique value externally
    this.id = null;      // will be set to a unique value externally
}

merge(Service.prototype, {
    get source() {
        return {
            type: this.type,
            id: this.id,
            name: this.name,
        };
    },

    _inbox(message) {
        const {
            source,
            action,
            data,
        } = message;

        if (this.respondsTo(action)) {
            return this[action](data, source);
        } else {
            const error = new ActionNotFoundError(`Action ${action} does not exist for ${this.name}.`, action, this.source);

            return Future.reject(error);
        }
    },

    broadcast(channel, data = null) {
        return this._outbox({
            source: this.source,
            destination: null,
            channel,
            data,
        }, false).fork(() => {}, () => {});
    },

    tell(whom, what, data = null) {
        return this._outbox({
            source: this.source,
            destination: whom,
            action: what,
            data,
        }, false).fork(() => {}, () => {});
    },

    ask(whom, what, data = null) {
        return this._outbox({
            source: this.source,
            destination: whom,
            action: what,
            data,
        }, true);
    },

    seek(what, data = null) {
        return this.ask('*', what, data);
    },

    subscribe(channel, action, filter) {
        if (typeof action === 'string') {
            action = this[action].bind(this);
        }

        return this.tell(this._outbox.source.id, 'subscription:create', {
            channel,
            action,
            filter,
        });
    },

    configure(config) {
        return Future.of(null);
    },

    reconfigure(config) {
        return this.configure(config).chain(() => this.restart({}));
    },

    start() {
        return Future.of(null);
    },

    stop() {
        return Future.of(null);
    },

    restart(data) {
        return this.stop(data).chain(() => this.start(data));
    },

    status() {
        return Future.of('unknown');
    },

    describe() {
        return wrapFuture(this.status()).map((status) => Object.assign(this.source, {status}));
    },

    registered() {
        return Future.of(null);
    },

    deregistered() {
        return Future.of(null);
    },

    respondsTo(what) {
        return this[actions$].has(what) && R.is(Function, this[what]);
    },
});

Service.define = function(serviceName, def = {}) {
    const {
        type = 'service',
        actions = {},
        proto = {},
        init = null,
    } = def;

    let DefinedService;
    let actionSet = new Set(Object.keys(actions).concat(defaultActions));

    let constr = function(name) {
        let service = {
            get [Symbol.toStringTag]() { return serviceName; },
            [actions$]: actionSet,
            __proto__: DefinedService.prototype,
        };

        Service.call(service, type, name, actions);

        if (R.is(Function, init)) {
            init.call(service);
        }

        return service;
    };

    DefinedService = createNamedFunction(serviceName, constr, ['name']);

    DefinedService.prototype = Object.create(Service.prototype);
    merge(DefinedService.prototype, proto);
    merge(DefinedService.prototype, actions);
    merge(DefinedService.prototype, {
        [actions$]: actionSet,
    });

    return DefinedService;
};

module.exports = Service;
