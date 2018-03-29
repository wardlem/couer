const {Pipeline} = require('couer-router');

module.exports = function(options = {}) {
    return function parseCookies(req, res) {
        return Pipeline.next(
            req.parseCookies(options, req),
            res
        );
    };
};
