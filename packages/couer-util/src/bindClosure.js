const uneval = require('./uneval');
const keygenerator = require('./keygenerator');

function bindClosure(fn, values = {}) {
    if (typeof fn !== 'function') {
        return function() {};
    }
    const keygen = keygenerator();
    const fnlength = fn.length;
    const args = [];
    for (let i = 0; i < fnlength; i += 1) {
        args.push(keygen());
    }

    const closurekey = keygen();
    const closuresource = uneval(fn);
    const valuessrcs = Object.keys(values).map(key => `const ${key} = ${uneval(values[key])};`);

    const source = `function ${fn.name}(${args.join(', ')}) {
    ${valuessrcs.join('\n    ')}
    return ${closuresource}(...[].slice.call(arguments));
}`;

    const wrapped = `(function(){return ${source}})()`;
    return eval(wrapped);
}

module.exports = bindClosure;
