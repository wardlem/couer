const merge = require('merge-descriptors');
const {Future} = require('navel');
const debug = require('debug')('couer:odm:Repo');
function Repo(storeName, collection) {
    return {
        get storeName() { return storeName; },
        get collection() { return collection; },

        __proto__: Repo.prototype,
    };
}

merge(Repo.prototype, {
    ask: () => {
        return Future.reject(new Error(`Repo for ${this.collection} has not connected to the kernel.`));
    },
    count(filter, options = {}) {
        return this.ask(this.storeName, 'count', {collection: this.collection, filter, options});
    },
    deleteMany(filter, options = {}) {
        return this.ask(this.storeName, 'deleteMany', {collection: this.collection, filter, options});
    },
    deleteOne(filter, options = {}) {
        return this.ask(this.storeName, 'deleteOne', {collection: this.collection, filter, options});
    },
    findMany(filter, options = {}) {
        return this.ask(this.storeName, 'findMany', {collection: this.collection, filter, options});
    },
    findOne(filter, options = {}) {
        return this.ask(this.storeName, 'findOne', {collection: this.collection, filter, options});
    },
    insertMany(documents, options = {}) {
        return this.ask(this.storeName, 'insertMany', {collection: this.collection, documents, options});
    },
    insertOne(document, options = {}) {
        return this.ask(this.storeName, 'insertOne', {collection: this.collection, document, options});
    },
    updateMany(filter, update, options = {}) {
        return this.ask(this.storeName, 'updateMany', {collection: this.collection, filter, update, options});
    },
    updateOne(filter, update, options = {}) {
        return this.ask(this.storeName, 'updateOne', {collection: this.collection, filter, update, options});
    },
});

module.exports = Repo;
