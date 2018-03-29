const methods = require('./methods');

Object.assign(exports, {
    Continuation: require('./Continuation'),
    Pipeline: require('./Pipeline'),
    methods,
    get: methods.get,
    head: methods.head,
    post: methods.post,
    put: methods.put,
    patch: methods.patch,
    'delete': methods.delete,
    scope: require('./scope'),
    overrideMethod: require('./overrideMethod'),
    extensionOverride: require('./extensionOverride'),
    'static': require('./static'),
    cors: require('./cors'),
});
