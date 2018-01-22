module.exports = function(include = []) {
    return include.map((key) => {
        return `include[]=${key}`;
    }).join('&');
};
