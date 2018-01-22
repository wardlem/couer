module.exports = function(Association) {
    const belongsToOne = Association.extend({
        meta: {
            single: true,
            unwind: false,
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
    }, {
        calculateForeignField(Model, OtherModel) {
            return OtherModel.pk;
        },
        calculateLocalField(Model, OtherModel) {
            return OtherModel.collectionName + 'Id';
        },
    });

    return function(associatedWith, localKey = undefined, foreignKey = undefined) {
        return belongsToOne.associatedWith(associatedWith).localField(localKey).foreignField(foreignKey);
    };
};
