const {Service} = require('navel');

const Store = function() {};

// This currently doesn't do a whole lot,
// but it may do more in the future
Store.define = function(serviceName, def = {}) {
    const {
        type = 'store',
        actions = {},
        proto = {},
        init = null,
    } = def;


    return Service.define(serviceName, {
        type,
        actions,
        proto,
        init,
    });
};

module.exports = Store;
