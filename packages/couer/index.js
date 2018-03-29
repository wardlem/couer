module.exports = {
    EventEmitter: require('couer-eventemitter'),
    Store: require('couer-store'),
};

[
    'navel',
    'couer-httpserver',
    'couer-auth',
    'couer-odm',
    'couer-ui',
    'couer-util',
    'couer-restapi',
].forEach((package) => {
    Object.assign(module.exports, require(package));
});
