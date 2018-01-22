const R = require('ramda');

function processValue(schema, key, value) {
    if (!schema.properties[key]) {
        return value;
    }

    return schema.properties[key].load(value);
}

function processQuery(schema, filter) {
    const keys = Object.keys(filter);

    if (keys.includes('and')) {
        if (keys.includes('or')) {
            return 'Invalid filter (can not have both \'and\' and \'or\' as top-level keys)';
        }

        let others = R.dissoc('and', filter);

        let and = Array.isArray(filter.and) ? filter.and : [filter.and];
        if (Object.keys(others).length) {
            and = and.concat([others]);
        }
        return {
            $and: and.map((subfilter) => processQuery(schema, subfilter)),
        };
    }

    if (keys.includes('or')) {

        let others = R.dissoc('or', filter);
        let othersQuery = Object.keys(others).length ? processQuery(schema, others) : null;

        if (othersQuery) {
            return {
                $and: [
                    processQuery(schema, Array.isArray(filter.or) ? filter.or : [filter.or]),
                    othersQuery,
                ],
            };
        }

        return {
            $or: filter.or.map((subfilter) => processQuery(schema, subfilter)),
        };
    }

    const out = {};
    for (let key of keys) {
        let def = filter[key];
        if (Array.isArray(def)) {
            def = {'in': def};
        }
        if (typeof def !== 'object') {
            def = {eq: def};
        }

        let defout = {};

        for (let defkey of Object.keys(def)) {
            switch (defkey) {
                case 'eq':
                case 'ne':
                case 'gt':
                case 'lt':
                case 'gte':
                case 'lte':
                    defout[`$${defkey}`] = processValue(schema, key, def[defkey]);
                    break;
                case 'in':
                case 'nin':
                    let usevalue = def[defkey];
                    if (!Array.isArray(usevalue)) {
                        usevalue = usevalue ? usevalue.split(',') : [];
                    }
                    usevalue = usevalue.map((v) => processValue(schema, key, v));
                    defout[`$${defkey}`] = usevalue;
                    break;
                default:
                    return `Invalid Query (operator ${defkey}) is not supported`;
            }
        }

        out[key] = defout;
    }

    return out;
}

module.exports = processQuery;
