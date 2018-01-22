module.exports = function(Association) {
    const hasMany = Association.extend({
        meta: {
            single: false,
            owner: true,
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
            return Model.collectionName + 'Id';
        },
        calculateLocalField(Model, OtherModel) {
            return Model.pk;
        },
    });

    return function(associatedWith, foreignKey = undefined, localKey = undefined) {
        return hasMany.associatedWith(associatedWith).localField(localKey).foreignField(foreignKey);
    };
};
