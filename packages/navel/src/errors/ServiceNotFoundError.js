const NavelError = require('./NavelError');

const ServiceNotFoundError = NavelError.define('ServiceNameConflictError', ['message', 'id']);

module.exports = ServiceNotFoundError;
