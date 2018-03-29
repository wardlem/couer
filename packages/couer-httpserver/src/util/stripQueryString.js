const urllib = require('url');

module.exports = function(url) {
    const urlObj = urllib.parse(url);
    urlObj.query = '';
    urlObj.search = '';
    return urllib.format(urlObj);
};
