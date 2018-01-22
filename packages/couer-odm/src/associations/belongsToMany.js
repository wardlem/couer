module.exports = function(Association) {
    const belongsToMany = Association.extend({
        meta: {
            single: false,
            unwind: true,
        },
        loaders: [
            (value, prop) => {
                return value && value.map((item) => {
                    return prop.getAssociatedModel()(item);
                });
            },
        ],
        unloaders: [
            (value, prop) => {
                return value && value.map((item) => {
                    return item.unload();
                });
            },
        ],
    }, {
        calculateForeignField(Model, OtherModel) {
            return OtherModel.pk;
        },
        calculateLocalField(Model, OtherModel) {
            return OtherModel.collectionName + 'Ids';
        },
    });

    return function(associatedWith, localKey = undefined, foreignKey = undefined) {
        return belongsToMany.associatedWith(associatedWith).localField(localKey).foreignField(foreignKey);
    };
};
