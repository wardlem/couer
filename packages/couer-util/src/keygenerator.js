function keygenerator() {
    let current = [];
    return function keygen() {
        let lastindex = current.length - 1;
        while (current[lastindex] && current[lastindex] === 'z') {
            current[lastindex] = 'a';
            lastindex -= 1;
        }

        if (!current[lastindex]) {
            current = ['a'].concat(current);
        } else {
            current[lastindex] = String.fromCharCode(current[lastindex].charCodeAt(0) + 1);
        }

        // underscore prefix to avoid returning a js keyword
        return `_${current.join('')}`;
    };
}

module.exports = keygenerator;
