const merge = require('merge-descriptors');
const Future = require('fluture');
const R = require('ramda');
const uuidv4 = require('uuidv4');

const ActionNotFoundError = require('./errors/ActionNotFoundError');
const BadArgumentsError = require('./errors/BadArgumentsError');


const createNamedFunction = require('./utils/createNamedFunction');
const wrapFuture = require('./utils/wrapFuture');

const actions$ = Symbol('actions');
const handlers$ = Symbol('handlers');
const handlerLookup$ = Symbol('handlerLookup');

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
            if (this[actions$].has(action)) {
                // normal action
                return this[action](data, source);
            } else {
                // broadcast handler
                return this[handlers$].get(action)(data, source);
            }
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

    subscribe(channel, action) {
        if (typeof channel !== 'string') {
            // TODO: do we really want to throw?
            throw BadArgumentsError(`${this.constructor.name}#subscribe expects a channel as a string for its first parameter`);
        }

        if (typeof action === 'function') {
            // we generate a pseudo-action for the service
            action = this._registerSubscriptionHandler(action);
        }

        if (typeof action !== 'string' || !this.respondsTo(action)) {
            // TODO: do we really want to throw?
            throw BadArgumentsError(`${this.constructor.name}#subscribe expects a valid action name or a function as its second parameter`);
        }

        return this.tell(this._outbox.source.id, 'subscription:create', {
            channel,
            action,
        });
    },

    unsubscribe(channel, action) {
        if (typeof channel !== 'string') {
            // TODO: do we really want to throw?
            throw BadArgumentsError(`${this.constructor.name}#unsubscribe expects a channel as a string for its first parameter`);
        }

        if (R.is(Function, action)) {
            action = this._deregisterSubscriptionHandler(action);
            if (action == null) {
                // could not find the subscription
                return;
            }
        }

        return this.tell(this._outbox.source.id, 'subscription:remove', {
            channel,
            action,
        });
    },

    _registerSubscriptionHandler(handler) {
        if (this[handlerLookup$].has(handler)) {
            const {action, references} = this[handlerLookup$].get(handler);
            this[handlerLookup$].set(handler, {
                action,
                references: references + 1,
            });

            return action;
        } else {
            const action = uuidv4();
            this[handlers$].set(action, handler);
            this[handlerLookup$].set(handler, {
                action,
                references: 1,
            });

            return action;
        }
    },

    _deregisterSubscriptionHandler(handler) {
        if (this[handlerLookup$].has(handler)) {
            const {action, references} = this[handlerLookup$].get(handler);
            console.log('action', action, 'references', references);
            if (references <= 1) {
                this[handlerLookup$].delete(handler);
                this[handlers$].delete(action);
            } else {
                this[handlerLookup$].set(handler, {
                    action,
                    references: references - 1,
                });
            }

            return action;
        }

        return null;
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
        return (this[actions$].has(what) && R.is(Function, this[what])) || this[handlers$].has(what);
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
            [handlers$]: new Map(),
            [handlerLookup$]: new Map(),
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
