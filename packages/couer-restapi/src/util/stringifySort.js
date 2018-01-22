module.exports = function(sort) {
    return Object.keys(sort).map((key) => {
        return sort[key] === -1 ? `-${key}` : key;
    }).join(',');
};
