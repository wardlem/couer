const url = require('url');
const R = require('ramda');
const qs = require('qs');

const Pipeline = require('../router/Pipeline');

module.exports = function queryParser(options = {}) {
    let opts = R.merge({
        plainObjects: true,
    }, options);
    return function parseQuery(req, res) {
        const query = qs.parse(url.parse(req.url, false).query, opts);
        return Pipeline.next(
            req.update({query: R.merge(query, req.query)}),
            res
        );
    };
};
