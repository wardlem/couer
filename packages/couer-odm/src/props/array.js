const R = require('ramda');

const Property = require('../Property');

module.exports = Property.extend({
    loaders: [
        (value, prop) => {
            if (R.is(String, value) && value[0] === '[') {
                // could be json
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // fail silently
                }
            }

            if (Array.isArray(value)) {
                value = value.map((value) => {
                    return prop.meta.of.load(value, prop.meta.of);
                });

                if (R.is(Function, prop.meta.unique)) {
                    value = R.uniqBy(prop.meta.unique, value);
                } else if (prop.meta.unique) {
                    value = R.uniq(value);
                }
            }

            return value;
        },
    ],
    unloaders: [
        (value, prop) => {
            const _of = prop.meta.of;
            if (Array.isArray(value)) {
                return value.map((item) => {
                    return _of.unload(item);
                });
            }

            return value;
        },
    ],
    meta: {
        'default': () => { return []; },
        minlen: 0,
        maxlen: Infinity,
        unique: false,
        of: require('./any'),
        formtype: 'repeater',
    },
    validators: [
        (value, prop) => {
            if (R.isNil(value) && prop.meta.optional) {
                return false;
            }

            if (!R.is(Array, value)) {
                return ['type', 'must be an array'];
            }

            let {minlen, maxlen} = prop.meta;

            if (value.length < minlen) {
                return ['minlen', `size must be at least ${prop.meta.minlen}`];
            }

            if (value.length > maxlen) {
                return ['maxlen', `size must be no more than ${prop.meta.maxlen}`];
            }

            const _of = prop.meta.of;

            const validationErrors = value.reduce((res, subvalue, index) => {

                let message = _of.validate(subvalue, _of);
                if (message) {
                    if (Array.isArray(message)) {
                        message = message[1];
                    }
                    res = res.concat([`item at index ${index} is invalid: [${message}]`]);
                }

                return res;
            }, []);

            if (validationErrors.length === 0) {
                return false;
            }

            return ['of', `${validationErrors.join('; ')}`];
        },
    ],
}, {
    minlen(len) {
        return this.withMeta('minlen', len);
    },
    maxlen(len) {
        return this.withMeta('maxlen', len);
    },
    unique(isunique) {
        return this.withMeta('unique', isunique);
    },
    of(subprop) {
        return this.withMeta('of', subprop);
    },
    jsonify(value) {
        const ofProp = this.meta.of;

        if (ofProp && Array.isArray(value)) {
            return value.map((v) => ofProp.jsonify(v));
        }

        return value;
    },
    formdef(key) {
        let base = Property.formdef.call(this, key);
        return Object.assign(base, {
            minlen: this.meta.minlen,
            maxlen: this.meta.maxlen,
            subdef: this.meta.of.formdef('[#]'),
            unique: this.meta.unique,
        });
    },
});
