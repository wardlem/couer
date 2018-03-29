const {Pipeline} = require('couer-httpserver');
const createHttpError = require('http-errors');
const Future = require('fluture');
const debug = require('debug')('couer:auth:sessionAuthenticator');

function createSessionAuth(options) {
    const {
        findUserByToken,
        findTokenByValue,
        destroyToken,
        findUserByCredentials,
        createTokenForUser,
        sessionKey = 'sessionToken',
        tokenValueKey = 'value',
        loginPath = '/login',
        loginMethod = 'POST',
        logoutPath = '/logout',
        logoutMethod = 'POST',
        sessionTokenType = 'session',
        cookieName = 'core.sid',
        formatters = {
            json: (req, res, data) => { return Pipeline.done(req, res.json(data, null, '\t')); },
        },
    } = options;

    return function(req, res) {
        if (req.resource === loginPath && req.ismethod('OPTIONS')) {
            debug('options request', req.headers);
            // return Pipeline.next(req, res);
            return Pipeline.done(req, res);
        } else if (req.resource === logoutPath && req.ismethod(logoutMethod)) {
            // logout the user if they are logged in
            const data = {
                data: null,
            };
            function writeLogoutResult() {
                const newReq = req.update({
                    session: Object.assign({}, req.session, {[tokenValueKey]: undefined}),
                });

                return res.status(200).update({
                    data: Object.assign({}, res.data, {
                        __destroySession: Object.assign({}, res.data.__destroySession || {}, {
                            [cookieName]: true,
                        }),
                    }),
                }).format(newReq, data, formatters);
            }
            if (!req.session[sessionKey]) {
                return writeLogoutResult();
            }

            return findTokenByValue(req.session[sessionKey])
                .chain((token) => {
                    if (!token) {
                        return null;
                    }

                    return destroyToken(token);
                })
                .chain(writeLogoutResult)
            ;

        } else if (req.resource === loginPath && req.ismethod(loginMethod)) {
            // login the user
            const credentials = req.hasbody ? req.body : req.query;
            return findUserByCredentials(credentials)
                .chain((user) => {
                    if (user == null) {
                        return Pipeline.error(createHttpError(401, 'Login Failed', {
                            details: {
                                description: 'The credentials provided do not match any in our system',
                            },
                        }));
                    }

                    return createTokenForUser(user, sessionTokenType)
                        .chain((token) => {
                            const tokenValue = token[tokenValueKey];
                            const data = {
                                data: {
                                    user,
                                    token,
                                },
                            };

                            const newReq = req.update({
                                session: Object.assign({}, req.session, {[sessionKey]: tokenValue}),
                            });

                            // debug('newReq session', newReq.session);

                            return res.status(201).format(newReq, data, formatters);
                        })
                    ;
                })
            ;
        } else if (req.data.user && req.data.user.authenticated) {
            return Pipeline.next(req, res);
        } else if (req.session[sessionKey]) {
            let token;
            return findTokenByValue(req.session[sessionKey])
                .chain((_token) => {
                    // debug('found session token', _token);
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

module.exports = createSessionAuth;
