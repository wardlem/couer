module.exports = function _makeFunction(name, fn, argNames = []) {
    const argVals = argNames.join(', ');
    const wrapped = '(function(fn){ return function ' + name + '(' + argVals + '){return fn.apply(this, arguments)}})(fn)';
    return eval(wrapped);
};
