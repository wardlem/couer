module.exports = function _makeFunction(name, fn, argNames = []) {
    // TODO: this can be done using the functions name property descriptor
    //       instead of having to use eval.  However, this does not change
    //       the result of calling toString on the function and will display
    //       the original name... but that is probably not a big deal.
    const argVals = argNames.join(', ');
    const wrapped = '(function(fn){ return function ' + name + '(' + argVals + '){return fn.apply(this, arguments)}})(fn)';
    return eval(wrapped);
};
