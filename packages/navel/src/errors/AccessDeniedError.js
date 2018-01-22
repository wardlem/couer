const NavelError = require('./NavelError');

const AccessDeniedError = NavelError.define('AccessDeniedError', ['message']);

module.exports = AccessDeniedError;
