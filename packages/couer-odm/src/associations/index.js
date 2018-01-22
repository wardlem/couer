module.exports = function(getModelByName) {
    const Association = require('./Association')(getModelByName);
    return {
        Association,
        belongsToOne: require('./belongsToOne')(Association),
        belongsToMany: require('./belongsToMany')(Association),
        hasOne: require('./hasOne')(Association),
        hasMany: require('./hasMany')(Association),
        embed: require('./embed')(getModelByName),
    };
};
