const bytes = require('bytes');
const R = require('ramda');

const Property = require('../Property');

module.exports = Property.extend({
    loaders: [
        (value, prop) => {
            if (R.is(String, value)) {
                return Buffer.from(value);
            }

            return value;
        },
    ],
    meta: {
        'default': () => { return Buffer.alloc(0); },
        minlen: 0,
        maxlen: Infinity,
        formtype: 'file',
    },
    validators: [
        (value, prop) => {
            if (R.isNil(value) && prop.meta.optional) {
                return false;
            }

            if (!R.is(Uint8Array, value)) {
                return ['type', 'must be binary data'];
            }

            let {minlen, maxlen} = prop.meta;


            if (R.is(String, minlen)) {
                minlen = bytes.parse(minlen);
            }
            if (R.is(String, maxlen)) {
                maxlen = bytes.parse(maxlen);
            }

            if (value.length < minlen) {
                return ['minlen', `size must be at least ${prop.meta.minlen}`];
            }

            if (value.length > maxlen) {
                return ['maxlen', `size must be no more than ${prop.meta.maxlen}`];
            }

            return false;
        },
    ],
}, {
    minlen(len) {
        return this.withMeta('minlen', len);
    },
    maxlen(len) {
        return this.withMeta('maxlen', len);
    },
    formdef(key) {
        let base = Property.formdef.call(this, key);
        return Object.assign(base, {
            minlen: this.meta.minlen,
            maxlen: this.meta.maxlen,
        });
    },
});
