const Property = require('../Property');
const R = require('ramda');

module.exports = Property.extend({
    loaders: [
        (value, prop) => {
            if (typeof value === 'string' && !isNaN(value)) {
                return new Date(parseFloat(value));
            } else if (typeof value === 'string' && Date(value) !== 'Invalid Date') {
                return new Date(value);
            } else if (typeof value === 'number') {
                return new Date(value);
            }

            return value;
        },
    ],
    meta: {
        'default': () => { return new Date(); },
        min: new Date(-100000000 * 86400000),
        max: new Date(100000000 * 86400000),
        formtype: 'datetime',
    },
    validators: [
        (value, prop) => {
            if (value == null && prop.meta.optional) {
                return false;
            } else if (!R.is(Date, value)) {
                return ['type', 'must be a date'];
            } else if (value.toString() === 'Invalid Date') {
                return ['type', 'must be a valid date'];
            } else if (value.getTime() < prop.meta.min.getTime()) {
                return ['min', `cannot be before ${prop.meta.min}`];
            } else if (value.getTime() > prop.meta.max.getTime()) {
                return ['min', `cannot be later than ${prop.meta.max}`];
            }

            return false;
        },
    ],
}, {
    min(value) {
        return this.withMeta('min', R.is(Date, value) ? value : new Date(value));
    },
    max(value) {
        return this.withMeta('max', R.is(Date, value) ? value : new Date(value));
    },
    formdef(key) {
        let base = Property.formdef.call(this, key);
        return Object.assign(base, {
            min: this.meta.min,
            max: this.meta.max,
        });
    },
});
