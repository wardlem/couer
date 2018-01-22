const Property = require('../Property');

module.exports = Property.extend({
    loaders: [
        (value, prop) => {
            if (typeof value === 'string' && !isNaN(value)) {
                return parseFloat(value);
            }

            return value;
        },
    ],
    meta: {
        'default': 0,
        min: -Infinity,
        max: Infinity,
        nan: false,
        infinite: true,
    },
    validators: [
        (value, prop) => {
            if (value == null) {
                return false;
            } else if (typeof value !== 'number') {
                return ['type', 'must be a number'];
            } else if (!prop.meta.nan && isNaN(value)) {
                return ['nan', 'must be a valid number'];
            } else if (!prop.meta.infinite && !Number.isFinite(value) && !isNaN(value)) {
                return ['infinite', 'must be a finite number'];
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
    nan(allow) {
        return this.withMeta('nan', Boolean(allow));
    },
    infinite(allow) {
        return this.withMeta('infinite', Boolean(allow));
    },
    formdef(key) {
        let base = Property.formdef.call(this, key);
        return Object.assign(base, {
            min: this.meta.min,
            max: this.meta.max,
        });
    },
});
