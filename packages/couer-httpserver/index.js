const router = require('./src/router');
Object.assign(exports, {
    Server: require('./src/Server'),
    router,
    Pipeline: router.Pipeline,
    parsers: require('./src/parsers'),
    session: require('./src/session'),
});
