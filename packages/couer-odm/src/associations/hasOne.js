module.exports = function(Association) {
    const hasMany = Association.extend({
        meta: {
            single: true,
            owner: true,
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
