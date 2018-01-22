const R = require('ramda');
const mergeDescriptors = require('merge-descriptors');

const Property = require('./Property');

function Schema(properties) {
    return {
        get properties() { return properties; },
        __proto__: Schema.prototype,
    };
}

mergeDescriptors(Schema.prototype, {
    get ['default']() {
        return R.map(R.prop('_default'), this.properties);
    },

    validate(model) {
        const props = this.properties;
        return Object.keys(props).reduce((result, key) => {
            const prop = props[key];
            const error = prop.validate(model[key]);
            if (error) {
                result[key] = error;
            }

            return result;
        }, {});
    },

    isvalid(model) {
        const props = this.properties;
        return Object.keys(this.properties).reduce((result, key) => {
            if (!result) {
                return result;
            }

            const prop = props[key];
            return !prop.validate(model[key]);
        }, true);
    },

    load(data) {
        return R.merge(this.default, this.update(data));
    },

    update(data) {
        const props = this.properties;
        return Object.keys(data).reduce((result, key) => {
            if (props[key]) {
                result[key] = props[key].load(data[key]);
            }
            return result;
        }, {});
    },

    unload(model) {
        const props = this.properties;
        return Object.keys(props).reduce((result, key) => {
            const prop = props[key];

            // todo: make more generic
            if (prop.isAssociation || prop.istemp) {
                return result;
            }
            result[key] = prop.unload(model[key]);
            return result;
        }, {});
    },

    inspect(depth, options) {
        if (depth < 0) { return options.stylize('[Schema]', 'special'); }
        return options.stylize('Schema', 'special') + ' ' + require('util').inspect({
            properties: this.properties,
        }, depth, options);
    },
});

Schema.Property = Property;

module.exports = Schema;
