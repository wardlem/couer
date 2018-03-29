const {Future, Service} = require('navel');
const path = require('path');
const fs = require('fs');
const R = require('ramda');

const debug = require('debug')('couer:ODM');

const ODM = Service.define('ODM', {
    init: function() {
        this.modeldir = path.resolve(process.cwd(), './models');
        this.models = [];
    },
    actions: {
        configure({modeldir, defaultstore}) {
            this.modeldir = modeldir ||  path.resolve(process.cwd(), './models');
        },
        start() {
            if (this.models.length) {
                return 'already started';
            }

            return this.readModels().map((models) => {
                this.models = models;
                models.forEach((model) => {
                    if (model && model.repo) {
                        model.repo.ask = this.ask.bind(this);
                    }
                });
                return 'ok';
            });
        },
        stop() {
            this.models.forEach((model) => {
                delete model.repo.ask;
            });
            this.models = [];

            return 'ok';
        },
    },
    proto: {
        readModels() {
            const modeldir = this.modeldir;
            debug('reading models at', modeldir);
            return Future.node((done) => fs.readdir(modeldir, done))
                .map((files) => {
                    debug('files: ', files);
                    const filtered = files.filter((file) => /^[A-Z].*\.js$/.test(file));
                    debug('filtered: ', filtered);
                    return filtered;
                })
                .map(R.map((file) => path.resolve(modeldir, file)))
                .map(R.map(require))
            ;
        },
    },
});

module.exports = ODM;
