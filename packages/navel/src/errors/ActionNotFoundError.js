const NavelError = require('./NavelError');

const ActionNotFoundError = NavelError.define('ActionNotFoundError', ['message', 'action', 'source']);

module.exports = ActionNotFoundError;
