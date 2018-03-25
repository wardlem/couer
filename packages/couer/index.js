module.exports = {
    Kernel: require('navel').Kernel,
    Service: require('navel').Service,
    Future: require('fluture'),
    EventEmitter: require('couer-eventemitter'),
};

[
    'couer-server',
    'couer-auth',
    'couer-odm',
].forEach((package) => {
    Object.assign(module.exports, require(package));
});
