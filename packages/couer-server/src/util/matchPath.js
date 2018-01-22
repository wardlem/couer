const UrlPattern = require('url-pattern');

module.exports = function(expected, given, addSplat = false) {

    if (addSplat) {
        expected += (expected === '/' ? '(*)' : '(/*)');
    }

    const matcher = new UrlPattern(expected);

    return matcher.match(given);
};
