const {Pipeline} = require('couer-httpserver');
const {done} = Pipeline;

const yaml = require('js-yaml');

module.exports = function createYamlFormatter(options = {}) {
    const {
        jsyamlOptions = {},
    } = options;

    return function yamlFormatter(req, res, data) {
        return done(req, res.send(yaml.safeDump(data, jsyamlOptions)).header('Content-Type', 'application/yaml'));
    };
};
