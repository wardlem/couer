const R = require('ramda');

module.exports = (path) => {
    if (path !== '/' && R.last(path) === '/') {
        return R.init(path);
    }

    return path;
};
