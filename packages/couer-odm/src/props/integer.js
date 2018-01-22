const Property = require('../Property');

module.exports = Property.extend({
    loaders: [
        (value, prop) => {
            if (typeof value === 'string' && !isNaN(value) && Number.isInteger(parseFloat(value))) {
                return parseInt(value);
            } else if (typeof value === 'number' && !Number.isInteger(value)) {
                return Math.trunc(value);
            }

            return value;
        },
    ],
    meta: {
        'default': 0,
        min: -Infinity,
        max: Infinity,
    },
    validators: [
        (value, prop) => {
            if (value == null) {
                return false;
            } else if (!Number.isInteger(value)) {
                return ['type', 'must be a whole number'];
            } else if (value < prop.meta.min) {
                return ['min', `must be at least ${prop.meta.min}`];
            } else if (value > prop.meta.max) {
                return ['max', `must be no more than ${prop.meta.max}`];
            }

            return false;
        },
    ],
}, {
    min(value) {
        return this.withMeta('min', value);
    },
    max(value) {
        return this.withMeta('max', value);
    },
    formdef(key) {
        let base = Property.formdef.call(this, key);
        return Object.assign(base, {
            min: this.meta.min,
            max: this.meta.max,
        });
    },
});
