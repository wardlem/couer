const Future = require('fluture');
const Pipeline = require('couer-httpserver/src/router/Pipeline');
const debug = require('debug')('core:auth');

const Authorization = require('./Authorization');

function createAuthorizer(options) {
    const {
        policies = {},
        authenticators = [],
        excludeRoutes = [],
    } = options;

    const excludeRoutesSet = new Set(excludeRoutes);

    const authenticatePipeline = Pipeline.build(authenticators);

    return function authorizeRequest(req, res) {
        debug(`authorizing request: ${req.method.toUpperCase()} ${req.resource}`);
        return authenticatePipeline.run(req, res)
            .chainRej((err) => {
                if (excludeRoutesSet.has(`${req.method.toUpperCase()} ${req.resource}`)) {
                    const authorization = Authorization(policies, null);
                    return Pipeline.next(
                        req.withData('authorization', authorization),
                        res
                    );
                }

                return Pipeline.error(err);
            })
            .chain((continuation) => {
                if (continuation.isdone) {
                    return Future.of(continuation);
                }


                const {req, res} = continuation;
                if (req.data.user) {
                    // authentication succeeded
                    const authorization = Authorization(policies, req.data.user.data);
                    return Pipeline.next(
                        req.withData('authorization', authorization),
                        res
                    );
                } else {
                    // authentication failed
                    const authorization = Authorization(policies, null);
                    return Pipeline.next(
                        req.withData('authorization', authorization),
                        res
                    );
                }
            });
    };
}

module.exports = createAuthorizer;
