const fs = require('fs');
const yaml = require('js-yaml');
const Future = require('fluture');

function loadConfig(path) {
    return Future.node((done) => fs.readFile(path, done))
        .map((contents) => yaml.load(contents))
    ;
}

module.exports = loadConfig;
