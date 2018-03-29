const {Pipeline} = require('couer-httpserver');
const {done} = Pipeline;

module.exports = function createJsonFormatter(options = {}) {
    return function jsonFormatter(req, res, data) {
        return done(req, res.json(data, null, '\t'));
    };
};
