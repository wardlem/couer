const {extname, resolve} = require('path');
const {readFile} = require('fs');

const merge = require('merge-descriptors');
const Future = require('fluture');
const {curry} = require('ramda');

const CACHE = new Map();

function Config(data = {}, env = {}) {
    return {
        get env() { return env; },
        get data() { return data; },
        __proto__: Config.prototype,
    };
}

Config.load = function load(rootPath, env = process.env) {
    return Config.loadFile(rootPath)
        .chain(Config.processData)
        .map((data) => {
            return Config(data, env);
        });
};

Config.loadFile = function loadFile(path) {
    if (CACHE.has(path)) {
        return Future.of(CACHE.get(path));
    }
    const ext = extname(path);
    return Future.of(path)
        .chain((path) => {
            if (ext === '.json' || ext === '.js') {
                // require json / js
                // TODO: ensure js is returning valid data (i.e. not a function)
                try {
                    return Future.of(require(path)).map(saveFileCache(path));
                } catch (e) {
                    return Future.reject(e);
                }
            } else if (ext === '.yml' || ext === '.yaml') {
                const YAML = require('js-yaml');
                const future = Future.cache(Future.node((cb) => readFile(path, cb)).chain((contents) => {
                    try {
                        return Future.of(YAML.safeLoad(contents));
                    } catch (e) {
                        return Future.reject(e);
                    }
                }));
                saveFileCache(path, future);
                return future;
            } else {
                // TODO: make this a better error type
                return Future.reject(new Error(`File at path ${path} has an unsupported file extension ${ext}`));
            }
        })
    ;
};

Config.processData = function processData(data) {
    // Here are the rules:
    // "$ENV_VAR" => lookup up $ENV_VAR in environment
    // "\$ENV_VAR" => string "$ENV_VAR"
    // "$ENV_VAR|DEFAULT" => lookup up $ENV_VAR in environment, "DEFAULT" is default
    // "$ENV_VAR\|DEFAULT" => lookup up $ENV_VAR|DEFAULT in environment
    // "@inc:./path/to/other/file.yml" => load file at path and set as value in current value
    // "@case:$ENV_VAR"
    // "@if:$ENV_VAR"
    // "@date:$ENV_VAR"
    // "@bool:$ENV_VAR"
    // "@num:$ENV_VAR"
    // "@json:$ENV_VAR

    if (Array.isArray(data)) {
        return data.map(Config.processData);
    }
    if (typeof data === 'object') {
        // TODO: make sure this is a plain object
        return Object.keys(data).reduce((res, key) => {
            if (key[0] === '@') {

            } else if (key[0] === '$') {

            }
        }, {});
    }
};

function parseOperator(str) {
    const parts = [];
    let part = '';

    let i;
    while (i < str.length) {
        if (str[i] === '\\') {
            i += 1;
            part += str[i];
        } else if (str[i] === ':') {
            parts.push(part);
        } else {
            part += str[i];
        }
        i += 1;
    }
}

const saveFileCache = curry(function saveFileCache(path, data) {
    CACHE.set(path, Future.of(data));
    return data;
});

module.exports = Config;
