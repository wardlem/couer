const Future = require('fluture');
const debug = require('debug')('couer:session:ModelStore');
module.exports = function(Model, options = {}) {
    const store = {};

    const {
        sidKey = 'sid',
        dataKey = 'data',
    } = options;

    debug('MODEL:', Model);

    store.initSession = (sid) => {
        debug('initializing session');
        const model = Model({
            [sidKey]: sid,
            [dataKey]: {sid},
        });

        return Model.insertOne(model)
            .map((m) => m[dataKey])
        ;
    };

    store.loadSession = (sid) => {
        debug('loading session');
        return Model.findOne({[sidKey]: sid})
            .map((t) => t ? t[dataKey] : {})
        ;
    };

    store.saveSession = (sid, value) => {
        debug('saving session', sid, value);
        return Model.findOne({[sidKey]: sid})
            .chain((t) => {
                if (t === null) {
                    t = Model({
                        [sidKey]: sid,
                        [dataKey]: value,
                    });
                    return Model.insertOne(t);
                }

                return Future.of(t);
            })
            .chain((t) => {
                t.update({[dataKey]: value});

                return Model.updateOne(t).map(t => t[dataKey]);
            })
        ;
    };

    store.destroySession = (sid) => {
        debug('destroying session');
        return Model.findOne({[sidKey]: sid})
            .chain((t) => {
                if (t === null) {
                    return Future.of({});
                }

                return Model.deleteOne(t).map(t => t[dataKey]);
            })
        ;
    };

    store.touchSession = (sid, value) => {
        debug('touching session');
        return Model.findOne({[sidKey]: sid})
            .chain((t) => {
                if (t === null) {
                    t = Model({
                        [sidKey]: sid,
                        [dataKey]: value,
                    });
                    return Model.insertOne(t);
                }

                return Future.of(t);
            })
            .chain((t) => {
                if (t === null) {
                    return Future.reject('Session is not initialized');
                }

                return Model.updateOne(t).map(t => t[dataKey]);
            })
        ;
    };

    return store;
};
