const {
    $$END_OF_PATTERN,
    $$STAR,
    $$GLOBSTAR,
} = require('./constants');

const DEFAULT_OPTIONS = {
    sep: ':',
    star: '*',
    globstar: '**',
    pathonly: false,
};

function parsePattern(input, options = {}) {
    options = Object.assign({}, DEFAULT_OPTIONS, options);
    const {
        sep,
        star,
        globstar,
        pathonly,
    } = options;

    const parts = [];
    let part = '';
    let i = 0;
    let lastWasSep = true;
    while (i < input.length) {
        if (matches(input, i, sep)) {
            parts.push(part);
            part = '';
            i += sep.length;
            lastWasSep = true;
        } else if (!pathonly && part.length === 0 && matches(input, i, globstar, sep)) {
            parts.push($$GLOBSTAR);
            const nMatched = matches(input, i, globstar, sep);
            i += nMatched;
            lastWasSep = nMatched > globstar.length;
        } else if (!pathonly && part.length === 0 && matches(input, i, star, sep)) {
            parts.push($$STAR);
            const nMatched = matches(input, i, star, sep);
            i += nMatched;
            lastWasSep = nMatched > star.length;
        } else {
            if (input[i] === '\\') {
                i += 1;
            }
            part += input[i];
            i += 1;
            lastWasSep = false;
        }
    }

    // last part
    if (part.length > 0 || lastWasSep) {
        parts.push(part);
    }

    // end
    parts.push($$END_OF_PATTERN);

    return parts;
}

function matches(input, index, search, terminator = null) {
    if (search.length === 0) {
        return 0;
    }

    for (let i = 0; i < search.length; i += 1) {
        if (input[i + index] !== search[i]) {
            return 0;
        }
    }

    if (terminator != null) {
        if (input[index + search.length] == null) {
            // the end so we are good
            return search.length;
        }
        for (let i = 0; i < terminator.length; i += 1) {
            if (input[i + index + search.length] !== terminator[i]) {
                return 0;
            }
        }

        return search.length + terminator.length;
    }

    return search.length;
}


module.exports = parsePattern;
