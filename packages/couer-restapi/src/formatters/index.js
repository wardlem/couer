const json = require('./json');
const yaml = require('./yaml');
const xml = require('./xml');

Object.assign(exports, {
    json,
    yaml,
    defaults: {
        'application/json': json(),
        'text/json': json(),
        'application/yaml': yaml(),
        'text/yaml': yaml(),
        // 'application/xml': xml(),
        // 'text/xml': xml(),
    },
});
