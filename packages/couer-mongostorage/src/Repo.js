const Future = require('fluture');
const {pick} = require('ramda');
const debug = require('debug')('core:db:mongo:repo');

module.exports = function(getConnection) {

    function Repo(collectionName) {
        return {
            collectionName,
            __proto__: Repo.prototype,
        };

    }

    const findOpts = ['hint', 'limit', 'maxTimeMS', 'skip', 'sort'];
    const pickFindOneOpts = pick(findOpts);

    Repo.prototype = {
        get collection() {
            return getConnection().map(c => c.collection(this.collectionName));
        },

        cursor(query, opts) {
            return this.collection
                .chain(collection => Future((rej, res) => {
                    try {
                        const cursor = findOpts.reduce((cursor, key) => {
                            if (typeof opts[key] !== 'undefined') {
                                return cursor[key](opts[key]);
                            }

                            return cursor;
                        }, collection.find(query));
                        res(cursor);
                    } catch (e) {
                        rej(e);
                    }
                }))
            ;
        },
        aggregate(pipeline, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.aggregate(pipeline, options, done)));
        },
        count(query, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.count(query, options, done)));
        },
        countAll(options = {}) {
            return this.count({}, options);
        },
        createIndex(spec, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.createIndex(spec, options, done)));
        },
        deleteMany(filter, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.deleteMany(filter, options, done)));
        },
        deleteOne(filter, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.deleteOne(filter, options, done)));
        },
        distinct(key, query, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.distinct(key, query, options, done)));
        },
        drop() {
            return this.collection
                .chain(collection => Future.node(done => collection.drop(done)));
        },
        dropIndex(name, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.dropIndex(name, options, done)));
        },
        ensureIndex(spec, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.ensureIndex(spec, options, done)));
        },
        explain(query, options = {}) {
            return this.cursor(query, options)
                .chain(cursor => Future.node(done => cursor.explain(done)));
        },
        find(query, options = {}) {
            return this.cursor(query, options)
                .chain(cursor => Future.node(done => cursor.toArray(done)));
        },
        findOne(query, options = {}) {
            const filteredOptions = pickFindOneOpts(options);
            return this.collection
                .chain(collection => Future.node(done => collection.findOne(query, filteredOptions, done)));
        },
        findOneAndDelete(filter, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.findOneAndDelete(filter, options, done)));
        },
        findOneAndReplace(filter, replacement, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.findOneAndReplace(filter, replacement, options, done)));
        },
        findOneAndUpdate(filter, update, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.findOneAndUpdate(filter, update, options, done)));
        },
        geoHaystackSearch(x, y, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.geoHaystackSearch(x, y, options, done)));
        },
        geoNear(x, y, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.geoNear(x, y, options, done)));
        },
        get indexes() {
            return this.collection
                .chain(collection => Future.node(done => collection.indexes(done)));
        },
        indexExists(index) {
            return this.collection
                .chain(collection => Future.node(done => collection.indexExists(index, done)));
        },
        insertMany(documents, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.insertMany(documents, options, done)));
        },
        insertOne(document, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.insertOne(document, options, done)));
        },
        get iscapped() {
            return this.collection
                .chain(collection => Future.node(done => collection.isCapped(done)));
        },
        get options() {
            return this.collection
                .chain(collection => Future.node(done => collection.options(done)));
        },
        stats(options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.stats(options, done)));
        },
        updateMany(filter, update, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.updateMany(filter, update, options, done)));
        },
        updateOne(filter, update, options = {}) {
            return this.collection
                .chain(collection => Future.node(done => collection.updateOne(filter, update, options, done)));
        },
    };

    return Repo;
};
