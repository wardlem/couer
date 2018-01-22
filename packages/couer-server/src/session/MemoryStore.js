const Task = require('fluture');

const data = new Map();

exports.initSession = (sid) => {
    data.set(sid, {sid});

    return Task.of(data.get(sid));
};

exports.loadSession = (sid) => {
    return Task.of(data.get(sid) || {});
};

exports.saveSession = (sid, value) => {
    data.set(sid, value);

    return Task.of(value);
};

exports.destroySession = (sid) => {
    const oldSession = data.get(sid) || {};
    data.delete(sid);

    return Task.of(oldSession);
};

exports.touchSession = (sid, value) => {
    return Task.of(value);
};
