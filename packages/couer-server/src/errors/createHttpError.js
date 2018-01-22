const createError = require('http-errors');
// const merge = require('ramda').merge;

module.exports = function createHttpError(statusCode, message, extra = {}) {
    return createError(statusCode, message, extra);
};
