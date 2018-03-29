const pathlib = require('path');

const createHttpError = require('http-errors');

const scope = require('./scope');
const Pipeline = require('./Pipeline');

module.exports = function static(path, rootdir, options = {}) {

    rootdir = pathlib.isAbsolute(rootdir) ? rootdir : pathlib.resolve(process.cwd(), rootdir);

    return scope(path, [
        (req, res) => {
            const testMethod = req.method.toUpperCase();
            if (testMethod !== 'GET' && testMethod !== 'HEAD') {
                return Pipeline.error(createHttpError(405, 'Method Not Allowed', {headers: {
                    Allow: 'GET, HEAD',
                }}));
            }
            const filepath = pathlib.resolve(rootdir, `.${req.resource}`);
            return Pipeline.done(req, res.file(req, filepath, options));
        },
    ]);
};
