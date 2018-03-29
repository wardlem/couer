const Future = require('fluture');

const data = new Map();

exports.initSession = (sid) => {
    data.set(sid, {sid});

    return Future.of(data.get(sid));
};

exports.loadSession = (sid) => {
    return Future.of(data.get(sid) || {});
};

exports.saveSession = (sid, value) => {
    data.set(sid, value);

    return Future.of(value);
};

exports.destroySession = (sid) => {
    const oldSession = data.get(sid) || {};
    data.delete(sid);

    return Future.of(oldSession);
};

exports.touchSession = (sid, value) => {
    return Future.of(value);
};
