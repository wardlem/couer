const R = require('ramda');

const Property = require('../Property');

module.exports = Property.extend({
    meta: {
        'default': () => { return {}; },
        minkeys: 0,
        maxkeys: Infinity,
        of: require('./any'),
        require: [],
        ban: [],
        formtype: 'repeater',
    },
    loaders: [
        (value, prop) => {
            if (R.is(String, value) && value[0] === '{') {
                // could be json
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // fail silently
                }
            }

            if (R.isNil(value)) {
                return value;
            }

            // allow [{key: 'key', value: 'value'}] && [['key','value']]
            if (Array.isArray(value)) {
                value = value.reduce((obj, pair) => {
                    if (!pair) {
                        return obj;
                    }

                    if (Array.isArray(pair) && pair.length === 2) {
                        obj[pair[0]] = pair[1];
                    } else if (typeof pair === 'object' && typeof pair.key === 'string') {
                        obj[pair.key] = obj[pair.value];
                    }

                    return obj;
                });
            }

            if (R.is(Object, value)) {
                value = Object.keys(value).reduce((res, key) => {
                    res[key] = prop.meta.of.load(value[key], prop.meta.of);
                    return res;
                }, {});
            }

            return value;
        },
    ],
    unloaders: [
        (value, prop) => {
            const _of = prop.meta.of;
            if (!R.isNil(value) && R.is(Object, value)) {
                return Object.keys(value).reduce((res, key) => {
                    res[key] = _of.unload(value[key], _of);
                    return res;
                }, {});
            }

            return value;
        },
    ],
    validators: [
        (value, prop) => {
            if (R.isNil(value) && prop.meta.optional) {
                return false;
            }

            if (!R.is(Object, value)) {
                return ['type', 'must be an object'];
            }

            let {minkeys, maxkeys} = prop.meta;
            let keys = Object.keys(value);
            if (keys.length < minkeys) {
                return ['minlen', `must have at least ${minkeys} keys`];
            }

            if (value.length > maxkeys) {
                return ['maxlen', `must have no more than ${maxkeys} keys`];
            }

            if (prop.meta.require.length) {
                let missing = R.difference(prop.meta.require, keys);
                if (missing.length) {
                    return ['require', `key${missing.length > 1 ? 's' : ''} ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`];
                }
            }

            if (prop.meta.ban.length) {
                let found = R.intersection(prop.meta.ban, keys);
                if (found.length) {
                    return ['ban', `key${found.length > 1 ? 's' : ''} ${found.join(', ')} ${found.length > 1 ? 'are' : 'is'} banned.`];
                }
            }

            const _of = prop.meta.of;
            return keys.reduce((res, key) => {
                if (res) {
                    return res;
                }

                const subvalue = value[key];

                let message = _of.validate(subvalue, _of);
                if (message) {
                    return ['of', `value with key ${key} is invalid: ${message}`];
                }

                return false;
            }, false);
        },
    ],
}, {
    minkeys(len) {
        return this.withMeta('minkeys', len);
    },
    maxkeys(len) {
        return this.withMeta('maxkeys', len);
    },
    require(keys) {
        return this.withMeta('require', R.union(this.meta.require, keys));
    },
    ban(keys) {
        return this.withMeta('ban', R.union(this.meta.ban, keys));
    },
    of(subprop) {
        return this.withMeta('of', subprop);
    },
    jsonify(value) {
        const ofProp = this.meta.of;
        if (ofProp && typeof value === 'object' && value) {
            return Object.keys(value).reduce((out, key) => {
                out[key] = ofProp.jsonify(value[key]);
                return out;
            }, {});
        }

        return value;
    },
    formdef(key) {
        let base = Property.formdef.call(this, key);
        return Object.assign(base, {
            minlen: this.meta.minkeys,
            maxlen: this.meta.maxkeys,
            preprocess: (value) => {
                value = value || {};
                return Object.keys(value || {}).map((key) => [key, value[key]]);
            },
            subdef: {
                type: 'subform',
                subform: [
                    {
                        key: `${key}.key`,
                        label: `${this.label || key} Key`,
                        display: `${key}.key`,
                        type: 'text',
                        placeholder: '',
                        'default': '',
                    },
                    this.meta.of.formdef(`${key}.value`),
                ],
            },
        });
    },
});
