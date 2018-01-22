const qs = require('qs');

function stringifyQueryPart(query) {
    if (Array.isArray(query)) {
        return query.map(stringifyQueryPart);
    } else if (typeof query !== 'object') {
        return query;
    } else if (Object.prototype.toString.call(query) !== '[object Object]') {
        return String(query);
    }

    const keys = Object.keys(query);

    return keys.reduce((res, key) => {
        let usekey = key[0] === '$' ? key.substr(1) : key;
        res[usekey] = stringifyQueryPart(query[key]);
        return res;
    }, {});
}

function stringifyQuery(query) {
    query = stringifyQueryPart({filter: query});

    return decodeURIComponent(qs.stringify(query));
}

module.exports = stringifyQuery;
