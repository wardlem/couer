const R = require('ramda');
const Future = require('fluture');

const Pipeline = require('./Pipeline');
const {matchPath, stringifyPath, trimTrailingSlash} = require('couer-util');

module.exports = (route, pipeline) => {
    if (Array.isArray(pipeline)) {
        pipeline = Pipeline.build(pipeline);
    }
    route = trimTrailingSlash(route);
    return (req, res) => {
        const match = matchPath(route, req.resource, true);

        if (R.isNil(match)) {
            return Pipeline.next(req, res);
        }
        return pipeline.run(
            req.update({
                params: R.merge(req.params, R.dissoc('_', match)),
                resource: trimTrailingSlash('/' + (match._ || '')),
                resourceBase: req.resourceBase + stringifyPath(route, match),
            }),
            res
        ).chain(continuation => continuation.isdone ? Future.of(continuation) : Pipeline.next(req, res));
    };
};
