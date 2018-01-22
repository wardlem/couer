const UrlPattern = require('url-pattern');

module.exports = function(pathPattern, values) {
    const pattern = new UrlPattern(pathPattern);
    return pattern.stringify(values);
};
