const R = require('ramda');
const Property = require('../Property');
// const OnDelete = require('./OnDelete');

module.exports = function(getModelByName) {
    const Association = Property.extend({
        meta: {
            'default': undefined,
            associatedWith: '',
            localField: '',
            foreignField: '',
            single: false,
            unwind: false,
            optional: true,
            owner: false,
        },
        loaders: [

        ],
    }, {
        buildPipeline(Model, as) {
            const association = this;

            let {associatedWith, localField, foreignField, single, unwind} = association.meta;
            const OtherModel = getModelByName(associatedWith);

            if (!localField) {
                localField = this.calculateLocalField(Model, OtherModel);
            }

            if (!foreignField) {
                foreignField = this.calculateForeignField(Model, OtherModel);
            }

            const {properties} = Model.schema;
            const propkeys = Object.keys(properties);

            let pipeline = [
                {$lookup: {
                    from: OtherModel.collectionName,
                    localField,
                    foreignField,
                    as,
                }},
            ];

            if (single) {
                pipeline = R.concat(pipeline, [
                    {$project: R.assoc(as, {
                        $ifNull: [{$arrayElemAt: [`$${as}`, 0]}, null],
                    }, R.map((v) => 1, properties))},
                ]);
            }

            if (unwind) {
                pipeline = R.concat(R.concat([{
                    $unwind: {
                        path: `$${localField}`,
                        preserveNullAndEmptyArrays: true,
                    },
                }], pipeline), [{
                    $project: R.assoc(as, {
                        $arrayElemAt: [`$${as}`, 0],
                    }, R.map((k) => 1, properties)),
                }, {
                    $group: R.merge(R.reduce((res, k) => {
                        res[k] = {$first: `$${k}`};
                        return res;
                    }, {}, propkeys), {
                        [localField]: {$push: `$${localField}`},
                        [as]: {$push: `$${as}`},
                        _id: '$_id',
                    }),
                }]);
            }

            return pipeline;
        },
        getAssociatedModel: function() {
            return getModelByName(this.meta.associatedWith);
        },
        get isassociation() { return true; },
        associatedWith: function(other) {
            return this.withMeta('associatedWith', other);
        },
        localField: function(key) {
            return this.withMeta('localField', key);
        },
        foreignField: function(key) {
            return this.withMeta('foreignField', key);
        },
        jsonify(value) {
            if (value == null) {
                return value;
            } else if (Array.isArray(value)) {
                return value.map((v) => v.json);
            } else {
                return value.json;
            }
        },
    });

    return Association;
};
