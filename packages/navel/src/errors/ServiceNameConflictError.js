const NavelError = require('./NavelError');

const ServiceNameConflictError = NavelError.define('ServiceNameConflictError', ['message', 'serviceName']);

module.exports = ServiceNameConflictError;
