function uneval(data) {
    const genkey = keygenerator();
    const references = new Map();
    const mainSource = doUneval(data, references, genkey);

    const refSource = writeReferences(references);

    if (references.size === 0) {
        return mainSource;
    }

    return `(function(){${refSource}\nreturn ${mainSource};\n})()`;
}

function isReference(data) {
    if (isbuiltin) {
        return false;
    }

    switch (typeof data) {
        case 'string':
        case 'number':
        case 'boolean':
        case 'undefined':
            return false;
    }

    return true;
}

const builtins = require('./builtins');

function isbuiltin(data) {
    return builtins.has(data);
}

function writeBuiltin(data) {
    return builtins.get(data);
}

function doUneval(data, references, genkey) {
    if (references.has(data)) {
        return references.get(data).key;
    }

    if (isbuiltin(data)) {
        return writeBuiltin(data);
    }

    switch (typeof data) {
        case 'string':
            return writeString(data);
        case 'number':
        case 'boolean':
        case 'undefined':
            return String(data);
        case 'symbol':
            return unevalSymbol(data, references, genkey);
        case 'object':
            return unevalObject(data, references, genkey);
        case 'function':
            return unevalFunction(data, references, genkey);
    }
}

function unevalObject(data, references, genkey) {
    if (data === null) {
        return 'null';
    }

    const key = genkey();
    const declarations = [];

    const deps = [];

    let source;

    function propAssign() {
        let propkeys = Object.keys(data);
        if (Array.isArray(data)) {
            propkeys = propkeys.slice(data.length);
        }
        for (let propkey of propkeys) {
            let propval = data[propkey];
            if (isReference(propkey)) {
                deps.push(propkey);
            }
            if (isReference(propval)) {
                deps.push(propval);
            }

            source += `; ${key}[${doUneval(propkey, references, genkey)}] = ${doUneval(propval, references, genkey)}`;
        }
    }

    switch (data.constructor) {
        case undefined:
            source = `const ${key} = Object.create(null)`;
            propAssign(key, data);
            break;
        case Array:
            const arrvalstrings = data.map((propval) => {
                if (isReference(propval)) {
                    deps.push(propval);
                }
                return doUneval(propval, references, genkey);
            });

            source = `const ${key} = [${arrvalstrings.join(', ')}]`;
            // TODO: filter out index values and do propassign
            propAssign(key, data);
            break;
        case Date:
            source = `const ${key} = new Date(${data.valueOf()})`;
            propAssign(key, data);
            break;
        case Buffer:
            declarations.push('Buffer');
            // intentional fallthrough
        case ArrayBuffer:
        case Uint8Array:
        case Uint16Array:
        case Uint32Array:
        case Int8Array:
        case Int16Array:
        case Int32Array:
        case Float32Array:
        case Float64Array:
        case Uint8ClampedArray:
            source = `const ${key} = ${writeTypedArray(data)}`;
            propAssign(key, data);
            break;
        case Boolean:
            source = `const ${key} = new Boolean(${data.valueOf()})`;
            propAssign(key, data);
            break;
        case Number:
            source = `const ${key} = new Number(${data.valueOf()})`;
            propAssign(key, data);
            break;
        case String:
            source = `const ${key} = new String(${writeString(data.valueOf())})`;
            propAssign(key, data);
            break;
        case RegExp:
            source = `const ${key} = ${data.toString()}`;
            propAssign(key, data);
            break;
        case Map:
            const mappropstrings = Array.from(data).map(([propkey, propval]) => {
                if (isReference(propkey)) {
                    deps.push(propkey);
                }
                if (isReference(propval)) {
                    deps.push(propval);
                }

                return `${doUneval(propkey, references, genkey)}: ${doUneval(propval, references, genkey)}`;
            });

            source = `const ${key} = new Map([${mappropstrings.join(', ')}])`;
            propAssign(key, data);
            break;
        case Set:
            const setvalstrings = Array.from(data).map((propval) => {
                if (isReference(propval)) {
                    deps.push(propval);
                }

                return doUneval(propval, references, genkey);
            });

            source = `const ${key} = new Set([${setvalstrings.join(', ')}])`;
            propAssign(key, data);
            break;
        case Object:
        default:
            if (typeof data === 'object' && typeof data.toJSON === 'function') {
                let json = data.toJSON();
                if (!json || json.constructor !== data.constructor) {
                    return doUneval(json, references, genkey);
                }
            }
            const objpropstrings = Object.keys(data).map((propkey) => {
                let propval = data[propkey];
                let objkey = doUneval(propkey, references, genkey);
                if (isReference(key)) {
                    deps.push(key);
                    // wrap symbols
                    objkey = `[${key}]`;
                }
                if (isReference(propval)) {
                    deps.push(propval);
                }
                return `${objkey}: ${doUneval(propval, references, genkey)}`;
            });

            source = `const ${key} = {${objpropstrings.join(', ')}}`;
            break;
    }

    references.set(data, {
        key,
        source,
        deps,
        written: false,
        declarations,
    });

    return key;
}

function unevalFunction(data, references, genkey) {
    // It appears that recent versions of node will stringify
    // any function correctly except for built-in functions, closures, and bound functions.
    // This is great!
    // In the future, builtin functions should be added to the builtin map
    // and builtin functions won't be a problem.
    // Closures and bound functions seem like they will always be a problem...
    const key = genkey();
    const deps = [];
    let fnstring = data.toString();
    // TODO: any postprocessing necessary?
    if (/^[\w]+\(/.test(fnstring)) {
        fnstring = `function ${fnstring}`;
    }
    let source = `const ${key} = ${fnstring}`;

    let propkeys = Object.keys(data);
    if (Array.isArray(data)) {
        propkeys = propkeys.slice(data.length);
    }
    for (let propkey of propkeys) {
        let propval = data[propkey];
        if (isReference(propkey)) {
            deps.push(propkey);
        }
        if (isReference(propval)) {
            deps.push(propval);
        }

        source += `; ${key}[${doUneval(propkey, references, genkey)}] = ${doUneval(propval, references, genkey)}`;
    }

    references.set(data, {
        key,
        source,
        deps,
        written: false,
        declarations: [],
    });

    return key;
}

function unevalSymbol(data, references, genkey) {
    const key = genkey();
    const source = `const ${key} = ${data.toString().replace(/^Symbol\((.*)\)$/, (m, p1) => `Symbol(${writeString(p1)})`)}`;

    references.set(data, {
        key,
        source,
        deps: [],
        written: false,
        declarations: [],
    });

    return key;
}

function writeReferences(references) {
    const refsrc = Array.from(references).reduce((res, [ref, def]) => {
        if (def.writing || def.written) {
            return res;
        }

        return res.concat(writeReference(ref, def, references));
    }, []).join('\n');

    const declarations = Array.from(references.values()).reduce((res, def) => {
        const decs = def.declarations || [];
        decs.forEach((dec) => res.add(dec));
        return res;
    }, new Set());

    const decsrc = Array.from(declarations).map((decl) => {
        // TODO
        return '';
    }).join('\n');

    return decsrc ? `${decsrc}\n${refsrc}` : refsrc;
}

function writeReference(ref, def, references) {
    def.writing = true;

    // actually, if dep.writing && !dep.written, we have a circular reference and we
    // should handle it...but I have not gotten there yet
    const depsToWrite = def.deps.filter((dep) => !dep.writing && !dep.written);

    const depsrcs = depsToWrite.map((dep) => writeReference(dep, references.get(dep), references));
    const refsrc = `${def.source};`;

    def.written = true;

    return depsrcs.concat(refsrc);
}

function writeString(string) {
    let escaped = Array.from(string).map((c) => {
        switch (c) {
            case '\0':
                return '\\0';
            case '"':
                return '\\"';
            case '\\':
                return '\\\\';
            case '\n':
                return '\\n';
            case '\r':
                return '\\r';
            case '\v':
                return '\\v';
            case '\t':
                return '\\t';
            case '\b':
                return '\\b';
            case '\f':
                return '\\f';
            default:
                return c;
        }
    }).join('');

    return `"${escaped}"`;
}

function writeTypedArray(data) {
    const isArrayBuffer = data.constructor === ArrayBuffer;
    const useFloat = data.constructor === Float32Array || data.constructor === Float64Array;
    if (isArrayBuffer) {
        data = new Uint8Array(ArrayBuffer);
    }

    const valuesource = Array.from(data).map((value) => {
        if (useFloat) {
            return value.toString();
        }

        return `0x${value.toString(16)}`;
    }).join(', ');

    const constructorName = data.constructor === Buffer ? 'Uint8Array' : data.constructor.name;

    let source = `new ${constructorName}([${valuesource}])`;
    if (isArrayBuffer) {
        source += '.buffer';
    }

    return source;
}

const keygenerator = require('./keygenerator');

module.exports = uneval;
