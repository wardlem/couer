const contentType = require('content-type');

module.exports = function setCharset(type, charset) {
    const parsed = contentType.parse(type);
    parsed.parameters.charset = charset;
    return contentType.format(parsed);
};
