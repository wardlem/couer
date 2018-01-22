const {Service} = require('navel');

const Storage = function() {};

// This currently doesn't do a whole lot,
// but it may do more in the future
Storage.define = function(serviceName, def = {}) {
    const {
        type = 'storage',
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

module.exports = Storage;
