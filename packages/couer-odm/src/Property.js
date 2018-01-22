const mergeDescriptors = require('merge-descriptors');
const R = require('ramda');

function extend(parent, def, proto = {}) {
    const {
        validators = [],
        loaders = [],
        unloaders = [],
        messages = {},
        meta = {},
    } = def;

    const finalProto = mergeDescriptors(mergeDescriptors({}, parent.__proto__), proto);
    const newProp = {
        __proto__: finalProto,
        validators: parent.validators.concat(validators),
        loaders: parent.loaders.concat(loaders),
        unloaders: parent.unloaders.concat(unloaders),
        messages: R.merge(parent.messages, messages),
        meta: R.merge(parent.meta, meta),
    };

    newProp.extend = R.partial(extend, [newProp]);

    return newProp;
}

const proto = {
    update(values) {
        const newProp = {};
        mergeDescriptors(newProp, this);
        Object.assign(newProp, values);

        newProp.__proto__ = this.__proto__;

        return newProp;
    },
    withValidator(fn) {
        const validators = this.validators.concat([fn]);
        return this.update({validators});
    },
    withLoader(fn) {
        const loaders = this.loaders.concat([fn]);
        return this.update({loaders});
    },
    withMessage(key, message) {
        const messages = R.merge(this.messages, {[key]: message});
        return this.update({messages});
    },
    withMeta(key, value) {
        const meta = R.merge(this.meta, {[key]: value});
        return this.update({meta});
    },
    validate(value) {
        const error = this.validators.reduce((result, fn) => {
            return result || fn(value, this);
        }, false);

        if (error) {
            if (Array.isArray(error)) {
                const [key, message] = error;
                return R.is(String, this.messages[key]) ? this.messages[key] : message;
            }

            return error;
        }

        return false;
    },
    isvalid(value) {
        return !this.validate(value);
    },
    get ['_default']() {
        const def = this.meta.default;
        return R.is(Function, def) ? def(this) : def;
    },
    load(value) {
        return this.loaders.reduce((value, fn) => {
            return fn(value, this);
        }, value);
    },
    unload(value) {
        return value;
    },
    optional() {
        return this.withMeta('optional', true);
    },
    required() {
        return this.withMeta('optional', false);
    },
    temp() {
        return this.withMeta('temp', true);
    },
    protected() {
        return this.withMeta('protected', true);
    },
    hidden() {
        return this.withMeta('hidden', true);
    },
    shown() {
        return this.withMeta('hidden', false);
    },
    ['default'](value) {
        return this.withMeta('default', value);
    },
    formtype(type) {
        return this.withMeta('formtype', type);
    },
    label(value) {
        return this.withMeta('label', value);
    },
    pk() {
        return this.withMeta('pk', true);
    },
    get istemp() {
        return Boolean(this.meta.temp);
    },
    get isprotected() {
        return Boolean(this.meta.protected);
    },
    get ishidden() {
        return Boolean(this.meta.hidden);
    },
    equal(left, right) {
        return left === right;
    },
    jsonify(value) {
        return value;
    },
    formdef(key) {
        return {
            key,
            label: this.meta.label || key,
            display: key,
            type: this.meta.formtype,
            placeholder: '',
            'default': this.meta.default,
        };
    },
};

module.exports = {
    validators: [
        (value, self) => {
            if (R.isNil(value) && !self.meta.optional) {
                return ['optional', 'a value is required'];
            }
            return false;
        },
    ],
    loaders: [],
    unloaders: [],
    messages: {},
    meta: {optional: false, temp: false, 'protected': false, hidden: false, formtype: 'text'},
    __proto__: proto,
};

module.exports.extend = R.partial(extend, [module.exports]);
