const NavelError = require('./NavelError');

const BadArgumentsError = NavelError.define('BadArgumentsError', ['message']);

module.exports = BadArgumentsError;
