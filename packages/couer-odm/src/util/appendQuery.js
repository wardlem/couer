module.exports = function appendQuery(update, query) {
    if (Object.keys(update).length === 0) {
        return query;
    } else if (Object.keys(query).length === 0) {
        return update;
    } else if (query['$and']) {
        return Object.assign({}, query, {
            $and: query['$and'].concat([update]),
        });
    } else {
        return {
            $and: [query, update],
        };
    }
};
