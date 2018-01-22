const Property = require('../Property');
const R = require('ramda');

module.exports = function(getModelByName) {
    const embed = Property.extend({
        meta: {
            single: true,
            unwind: false,
            associatedWith: '',
        },
        loaders: [
            (value, prop) => {
                return value && prop.getAssociatedModel()(value);
            },
        ],
        unloaders: [
            (value, prop) => {
                return value && value.unload();
            },
        ],
        validators: [
            (value, prop) => {
                if (R.isNil(value) && prop.meta.optional) {
                    return false;
                }


                if (value.isvalid) {
                    return false;
                }

                const validationErrors = value.validate();

                return `${Object.keys(validationErrors).map((errKey) => {
                    return `${errKey}: ${validationErrors[errKey]}`;
                }).join('; ')}`;
            },
        ],
    }, {
        get isEmbed() {
            return true;
        },
        getAssociatedModel: function() {
            return getModelByName(this.meta.associatedWith);
        },
        associatedWith: function(other) {
            return this.withMeta('associatedWith', other);
        },
        jsonify(value) {
            if (value == null) {
                return value;
            }
            return value.json;
        },
        formdef(key) {
            let base = Property.formdef.call(this, key);
            let AssociatedModel = this.getAssociatedModel();
            let associatedProps = AssociatedModel.schema.properties;
            const subform = Object.keys(associatedProps).reduce((res, subkey) => {
                const prop = associatedProps[subkey];
                if (prop.isprotected) {
                    return res;
                }

                let subdef = prop.formdef(subkey);
                if (AssociatedModel.pk === subkey || prop.ishidden) {
                    subdef.type = 'hidden';
                }
                return res.concat([subdef]);
            }, []);

            return Object.assign(base, {
                type: 'subform',
                subform,
            });
        },
    });

    return function(associatedWith) {
        return embed.associatedWith(associatedWith);
    };
};
