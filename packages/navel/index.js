module.exports = {
    Service: require('./src/Service'),
    Kernel: require('./src/Kernel'),
    Future: require('fluture'),
    utils: {
        createNamedFunction: require('./src/utils/createNamedFunction'),
        loadConfig: require('./src/utils/loadConfig'),
        resolvePath: require('./src/utils/resolvePath'),
        wrapFuture: require('./src/utils/wrapFuture'),
    },
};
