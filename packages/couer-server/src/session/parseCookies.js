const Request = require('../http/Request');
const Pipeline = require('../router/Pipeline');

module.exports = function(options = {}) {
    return function parseCookies(req, res) {
        return Pipeline.next(
            Request.parseCookies(options, req),
            res
        );
    };
};
