const {ObjectID, MongoClient} = require('mongodb');
const Future = require('fluture');
const {pick} = require('ramda');
const debug = require('debug')('couer:MongoStore');

// const objectid = require('./objectid');

const Store = require('couer-store');

const findOpts = ['hint', 'limit', 'maxTimeMS', 'skip', 'sort'];
const pickFindOneOpts = pick(findOpts);

const MongoStore = Store.define('MongoStore', {
    init() {
        this.connection = null;
        this.uri = '';
        this.options = null;
    },
    actions: {
        configure(config) {
            const {uri, options = null}  = config;

            this.uri = uri;
            this.options = options;
        },
        start() {
            return this.getConnection().map(() => 'ok');
        },
        stop({force = false}) {
            return this.destroyConnection(force).map(() => 'ok');
        },
        status() {
            // TODO: run a query against the database to make sure the connection is good

            if (this.connection) {
                return 'connected';
            } else {
                return 'stopped';
            }
        },

        count({collection, filter, options = {}}) {
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.count(filter, options, done)));
        },
        deleteMany({collection, filter, options = {}}) {
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.deleteMany(filter, options, done)));
        },
        deleteOne({collection, filter, options = {}}) {
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.deleteOne(filter, options, done)));
        },
        findMany({collection, filter, options = {}}) {
            return this.cursor(collection, filter, options)
                .chain(cursor => Future.node(done => cursor.toArray(done)));
        },
        findOne({collection, filter, options = {}}) {
            const filteredOptions = pickFindOneOpts(options);
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.findOne(filter, filteredOptions, done)));
        },
        insertMany({collection, documents, options = {}}) {
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.insertMany(documents, options, done)));
        },
        insertOne({collection, document, options = {}}) {
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.insertOne(document, options, done)));
        },
        updateMany({collection, filter, update, options = {}}) {
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.updateMany(filter, update, options, done)));
        },
        updateOne({collection, filter, update, options = {}}) {
            return this.collection(collection)
                .chain(collection => Future.node(done => collection.updateOne(filter, update, options, done)));
        },
    },
    proto: {
        getConnection() {
            if (this.connection) {
                return Future.of(this.connection);
            } else if (this.uri) {
                return Future((reject, resolve) => {
                    const {uri, options = null} = this;
                    MongoClient.connect(uri, options, (err, connection) => {
                        if (err) {
                            return reject(err);
                        }

                        this.connection = connection;
                        resolve(connection);
                    });
                });
            }

            return Future.reject(new Error('Can not start mongodb storage without a valid uri'));
        },
        destroyConnection(force = false) {
            if (this.connection) {
                return Future.node((done) => this.connection.close(force, done)).map(() => {
                    this.connection = null;
                    return null;
                });
            } else {
                return Future.of(null);
            }
        },
        collection(collectionName) {
            return this.getConnection().map(c => c.collection(collectionName));
        },
        cursor(collectionName, filter, options) {
            return this.collection(collectionName)
                .chain(collection => Future((rej, res) => {
                    try {
                        const cursor = findOpts.reduce((cursor, key) => {
                            if (typeof options[key] !== 'undefined') {
                                return cursor[key](options[key]);
                            }

                            return cursor;
                        }, collection.find(filter));
                        res(cursor);
                    } catch (e) {
                        rej(e);
                    }
                }))
            ;
        },
    },
});

MongoStore.ObjectId = ObjectID;

module.exports = MongoStore;
