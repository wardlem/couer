const mergeDescriptors = require('merge-descriptors');
const R = require('ramda');
const Future = require('fluture');

function Authorization(policies, user) {
    return {
        get policies() { return policies; },
        get user() { return user; },
        __proto__: Authorization.prototype,
    };
}

mergeDescriptors(Authorization.prototype, {
    mask(Model, action, object) {
        const user = this.user;

        const policy = this.policyFor(Model);

        if (!policy || !R.is(Function, policy.mask)) {
            return [];
        }

        return policy.mask(object, action, user);
    },

    gate(Model, action, original, object) {
        const user = this.user;

        const policy = this.policyFor(Model);

        if (!policy || !R.is(Function, policy.gate)) {
            return Future.of(object);
        }

        return policy.gate(original, object, action, user);
    },

    filter(Model, action) {
        const user = this.user;

        const policy = this.policyFor(Model);

        if (!policy || !R.is(Function, policy.filter)) {
            return null;
        }

        return policy.filter(action, user);
    },

    policyFor(Model) {
        return this.policies[Model.id] || null;
    },
});

module.exports = Authorization;
