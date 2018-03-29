const {ObjectID} = require('mongodb');
const R = require('ramda');

const Property = require('../Property');

module.exports = Property.extend({
    loaders: [
        (value, prop) => {
            if (R.is(String, value) && (value.length === 12 || value.length === 24)) {
                try {
                    value = new ObjectID(value);
                } catch (e) {
                    // silent
                }
            }

            return value;
        },
    ],
    meta: {
        'default': (property) => new ObjectID(),
        // 'default': undefined,
    },
    jsonify(value) {
        return String(value);
    },
    validators: [
        (value, prop) => {
            if (R.is(ObjectID, value)) {
                return false;
            }

            return value == null ? false : ['type', 'must be an object id'];
        },
    ],
});
