const captureStackTrace = require('capture-stack-trace');

const ValidationError = function ValidationError(model, failures, message, info) {
    if (!(this instanceof ValidationError)) {
        return new ValidationError(model, failures, message, info);
    }
    captureStackTrace(this, this.constructor);
    this.name = ValidationError.name;
    this.message = message || (`${model.constructor.name} did not validate`);
    this.Model = model.constructor;
    this.model = model;
    this.failures = failures;
    this.info = info || {};
    this.statusCode = 422;
    this.expose = true;
};

ValidationError.prototype = Object.create(Error.prototype);
ValidationError.prototype.constructor = ValidationError;

module.exports = ValidationError;
