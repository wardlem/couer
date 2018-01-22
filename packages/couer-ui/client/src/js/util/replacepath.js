module.exports = function replaceParams(path, data) {
    console.log('path before', path, /(\/|=):([a-zA-Z0-9_]+)(\/|&|$)/g.test(path));

    while (/(\/|=):([a-zA-Z0-9_]+)(\/|$|&)/g.test(path)) {

        path = path.replace(/(\/|=):([a-zA-Z0-9_]+)(\/|$|&)/, (match, pre, key, post) => {
            console.log('found key', key);
            let mid;
            if (typeof data === 'function') {
                mid = data(key);
            } else {
                mid = data[key];
            }

            return `${pre}${mid}${post}`.replace(':', '###COLON###');

        });
    }

    console.log('path after', path);
    return path.replace('###COLON###', ':');
};
