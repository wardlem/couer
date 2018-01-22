const {next, done} = require('./Pipeline');

module.exports = function cors(config = {}) {
    // adapted from https://github.com/expressjs/cors/blob/master/lib/index.js
    const {
        origin = '*',
        methods = 'GET,HEAD,PUT,PATCH,POST,DELETE',
        headers = null,
        exposedHeaders = null,
        preflightContinue = false,
        optionsSuccessStatus = 204,
        credentials = false,
        maxAge = -1,
    } = config;

    function isOriginAllowed(origin, allowedOrigin) {
        if (Array.isArray(allowedOrigin)) {
            return allowedOrigin.reduce((res, allowed) => {
                return res || isOriginAllowed(origin, allowed);
            });
        } else if (typeof allowedOrigin === 'string') {
            return allowedOrigin === origin;
        } else if (allowedOrigin instanceof RegExp) {
            return allowedOrigin.test(origin);
        } else {
            return Boolean(allowedOrigin);
        }
    }

    function setOrigin(req, res) {
        if (!origin || origin === '*') {
            res = res.header('Access-Control-Allow-Origin', '*');
        } else if (typeof origin === 'string') {
            res = res.header('Access-Control-Allow-Origin', origin)
                .vary('Origin')
            ;
        } else {
            if (isOriginAllowed(req.header('Origin'), origin)) {
                res = res.header('Access-Control-Allow-Origin', req.header('origin'))
                    .vary('Origin')
                ;
            }
        }

        return res;
    }

    function setMethods(req, res) {
        let useMethods = methods;
        if (Array.isArray(useMethods)) {
            useMethods = useMethods.join(',');
        }

        if (useMethods) {
            res = res.header('Access-Control-Allow-Methods', useMethods);
        }

        return res;
    }

    function setCredentials(req, res) {
        if (credentials === true) {
            res = res.header('Access-Control-Allow-Credentials', 'true');
        }

        return res;
    }

    function setAllowedHeaders(req, res) {
        let useHeaders = headers;

        if (!useHeaders) {
            res = res.vary('Access-Control-Request-Headers');
            useHeaders = req.header('Access-Control-Request-Headers');
        } else if (Array.isArray(useHeaders)) {
            useHeaders = useHeaders.join(',');
        }

        if (useHeaders && useHeaders.length) {
            res = res.header('Access-Control-Allow-Headers', useHeaders);
        }

        return res;
    }

    function setExposedHeaders(req, res) {
        let useHeaders = exposedHeaders;
        if (!useHeaders) {
            return res;
        }

        if (Array.isArray(useHeaders)) {
            useHeaders = useHeaders.join(',');
        }

        if (useHeaders && useHeaders.length) {
            res = res.header('Access-Control-Expose-Headers', useHeaders);
        }

        return res;
    }

    function setMaxAge(req, res) {
        if (typeof maxAge === 'number' && maxAge > 0) {
            res = res.header('Access-Control-Max-Age', String(maxAge));
        }

        return res;
    }

    return (req, res) => {
        if (req.ismethod('OPTIONS')) {
            // preflight
            res = [
                setOrigin,
                setCredentials,
                setMethods,
                setAllowedHeaders,
                setMaxAge,
                setExposedHeaders,
            ].reduce((res, fn) => fn(req, res), res);

            if (preflightContinue) {
                return next(req, res);
            }

            return done(req, res.status(optionsSuccessStatus).header('Content-Length', '0'));
        }

        // actual request
        res = [
            setOrigin,
            setCredentials,
            setExposedHeaders,
        ].reduce((res, fn) => fn(req, res), res);

        return next(req, res);
    };
};
