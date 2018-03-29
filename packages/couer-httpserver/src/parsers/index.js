module.exports = {
    raw: require('./rawBodyParser'),
    text: require('./textBodyParser'),
    query: require('./queryParser'),
    urlencoded: require('./urlencodedBodyParser'),
    json: require('./jsonBodyParser'),
    multipart: require('./multipartBodyParser'),
};
