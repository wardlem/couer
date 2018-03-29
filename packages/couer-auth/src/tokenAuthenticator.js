const {Pipeline} = require('couer-httpserver');
const createHttpError = require('http-errors');
const Future = require('fluture');
const debug = require('debug')('couer:auth:tokenAuthenticator');
function createTokenAuth(options) {
    const {
        findUserByToken,
        findTokenByValue,
        headerKey = 'Api-Token',
    } = options;

    return function(req, res) {
        if (req.data.user && req.data.user.authenticated) {
            return Pipeline.next(req, res);
        } else if (req.header(headerKey)) {
            let token;
            return findTokenByValue(req.header(headerKey))
                .chain((_token) => {
                    token = _token;
                    return token ? findUserByToken(_token) : Future.of(null);
                })
                .chain((user) => {
                    return Pipeline.next(
                        req.withData('user', {
                            data: user,
                            token,
                            authenticated: Boolean(token),
                        }),
                        res
                    );
                })
            ;
        } else {
            return Pipeline.next(req, res);
        }
    };
}

module.exports = createTokenAuth;
