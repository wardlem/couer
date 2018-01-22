const {Pipeline} = require('../../server');
const {done} = Pipeline;

const data2xml = require('data2xml');

module.exports = function createXmlFormatter(options = {}) {
    const {
        xmlOptions = {},
        topLevelKey = 'Result',
    } = options;
    const xml = data2xml(xmlOptions);

    return function xmlFormatter(req, res, data) {
        return done(req, res.send(xml(topLevelKey, data)).header('Content-Type', 'application/xml'));
    };
};
