const merge = require('merge-descriptors');
const {Future} = require('navel');
const debug = require('debug')('couer:odm:Repo');
function Repo(storageName, collection) {
    return {
        get storageName() { return storageName; },
        get collection() { return collection; },

        __proto__: Repo.prototype,
    };
}

merge(Repo.prototype, {
    ask: () => {
        return Future.reject(new Error(`Repo for ${this.collection} has not connected to the kernel.`));
    },
    count(filter, options = {}) {
        return this.ask(this.storageName, 'count', {collection: this.collection, filter, options});
    },
    deleteMany(filter, options = {}) {
        return this.ask(this.storageName, 'deleteMany', {collection: this.collection, filter, options});
    },
    deleteOne(filter, options = {}) {
        return this.ask(this.storageName, 'deleteOne', {collection: this.collection, filter, options});
    },
    findMany(filter, options = {}) {
        return this.ask(this.storageName, 'findMany', {collection: this.collection, filter, options});
    },
    findOne(filter, options = {}) {
        return this.ask(this.storageName, 'findOne', {collection: this.collection, filter, options});
    },
    insertMany(documents, options = {}) {
        return this.ask(this.storageName, 'insertMany', {collection: this.collection, documents, options});
    },
    insertOne(document, options = {}) {
        return this.ask(this.storageName, 'insertOne', {collection: this.collection, document, options});
    },
    updateMany(filter, update, options = {}) {
        return this.ask(this.storageName, 'updateMany', {collection: this.collection, filter, update, options});
    },
    updateOne(filter, update, options = {}) {
        return this.ask(this.storageName, 'updateOne', {collection: this.collection, filter, update, options});
    },
});

module.exports = Repo;
