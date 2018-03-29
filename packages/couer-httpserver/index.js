const router = require('couer-router');

Object.assign(exports, {
    Server: require('./src/Server'),
    parsers: require('./src/parsers'),
    http: require('./src/http'),
    router,
    Pipeline: router.Pipeline,
});
