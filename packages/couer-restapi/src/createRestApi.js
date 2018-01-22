const debug = require('debug')('core:api');
const {STATUS_CODES} = require('http');

const {router, Pipeline} = require('couer-server');
const trimTrailingSlash = require('couer-server/utils/trimTrailingSlash');

const {next, done} = Pipeline;

function createRestApi(options, definitions) {
    const {
        authorize = (req, res) => next(req, res),
        rooturl = 'http://sampledomain.local',
        basepath = '/',
        formatters = require('./formatters').defaults,
    } = options;

    definitions = definitions.map((def) => def.type(def));
    const api = {
        definitions,
    };

    definitions.forEach((def) => {
        Object.defineProperty(def, 'api', {
            get: function() { return api; },
            enumerable: true,
        });
    });

    const defPipelines = definitions.map(
        (def) => def.pipeline(trimTrailingSlash(`${rooturl}${basepath}`), formatters)
    );

    return router.scope(basepath, Pipeline.build([
        authorize,
        router.get('/', (req, res) => {
            return res.format(req, {}, formatters);
        }),
    ].concat(defPipelines).concat([
        (req, res) => {
            // 404
            return res.status(404).format(req, {
                error: 'Not Found',
                status: 404,
                details: {},
            }, formatters);
        },
    ]))
        .recover((err, req, res) => {
            debug('Error occurred while processing api request: %O', err);
            let out;
            debug('Error code', err.status);

            out = {
                error: {
                    status: err.status || 500,
                    message: (err.expose && err.message) ? err.message : STATUS_CODES[err.status || 500],
                    details: err.details || {},
                },
            };
            res = res.addHeaders(err.headers || {}).status(err.status || 500);

            return res.format(req, out, formatters);
        })
    );
}

module.exports = createRestApi;
