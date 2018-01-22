const pathlib = require('path');

module.exports = function resolvePath(path) {
    if (pathlib.isAbsolute(path)) {
        return path;
    } else if (path[0] === '.') {
        return pathlib.resolve(process.cwd(), path);
    } else {
        return pathlib.resolve(process.cwd(), 'node_modules', path);
    }
};
