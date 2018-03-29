const R = require('ramda');
const Future = require('fluture');
const {Pipeline} = require('couer-router');
const uid = require('uid-safe').sync;
const debug = require('debug')('core:session');

const generateSid = () => uid(24);

const session = function session(options = {}) {
    const {
        cookie = {},
        key = 'core.sid',
        store = session.MemoryStore,
        genId = generateSid,
    } = options;
    return function sessionMiddleware(req, res) {
        // parse cookies
        const parsedReq = req.parseCookies(cookie);
        // find sid
        const _sid = parsedReq.cookies[key];
        const isNew = R.isNil(_sid);

        const sid = isNew ? genId() : _sid;

        debug('sid is:', sid);

        return Future.of([parsedReq, res])
            .chain(([req, res]) => {
                // load / initialize session
                return (isNew ? store.initSession(sid) : store.loadSession(sid))
                    .chain((session) => {
                        return Future.of([req.update({session}), res]);
                    });

            })
            .chain(([req, res]) => {
                const originalSession = req.session;
                return Pipeline.next(
                    req,
                    res.onHeader(([req, res]) => {
                        // save session values
                        if (R.path(['data', '__destroySession', key], res)) {
                            debug('destroying session');
                            return store.destroySession(key)
                                .map(() => [req, res.clearCookie(key)])
                            ;
                        } else if (!R.equals(originalSession, req.session)) {
                            return store.saveSession(sid, req.session)
                                .map(() => [req, res.cookie(key, sid, cookie)])
                            ;
                        } else {
                            // TODO allow this as an option
                            return store.touchSession(sid, req.session)
                                .map(() => [req, res.cookie(key, sid, cookie)])
                            ;
                        }
                    })
                );
            })
        ;
    };
};

session.parseCookies = require('./parseCookies');
session.MemoryStore = require('./MemoryStore');
session.ModelStore = require('./ModelStore');


module.exports = session;
