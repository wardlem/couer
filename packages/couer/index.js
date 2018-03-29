module.exports = {
    EventEmitter: require('couer-eventemitter'),
    Store: require('couer-store'),
    session: require('couer-session'),
    router: require('couer-router'),
};

module.exports.Pipeline = module.exports.router.Pipeline;

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
