const NavelError = require('./NavelError');

const ServiceNotFoundError = NavelError.define('ServiceNotFound', ['message', 'id']);

module.exports = ServiceNotFoundError;
