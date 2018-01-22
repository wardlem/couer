const R = require('ramda');
const Future = require('fluture');
const mergeDescriptors = require('merge-descriptors');
const pluralize = require('pluralize');

const Schema = require('./Schema');
const Repo = require('./Repo');

const props = require('./props');
const EventEmitter = require('couer-eventemitter');
const ValidationError = require('./errors/ValidationError');
const {createNamedFunction} = require('navel').utils;

const appendQuery = require('./util/appendQuery');

const authorization$ = Symbol('authorization');
const changeset$ = Symbol('changeset');

function createModel(model, registry, name, propDefs, options = {}) {

    const debug = require('debug')(`model:${name}`);

    const {
        allowDuplicateNames,
        calculateCollectionName,
        props,
    } = model;

    let {
        pk = null,
        hook = {},
        timestamps = true,
        softdelete = false,
        init = R.identity,
        storageName = model.storageName,
        collectionName = calculateCollectionName(name),
        indexes = {},
        methods = {},
    } = options;

    if (!allowDuplicateNames && registry.has(name)) {
        throw new Error(`Duplicate model name ${name}`);
    }

    if (timestamps) {
        if (!propDefs.createdAt) {
            propDefs = R.assoc('createdAt', props.date.hidden(), propDefs);
        }
        if (!propDefs.modifiedAt) {
            propDefs = R.assoc('modifiedAt', props.date.hidden(), propDefs);
        }
    }

    if (softdelete) {
        if (!propDefs.deletedAt) {
            propDefs = R.assoc('modifiedAt', props.date.optional().default(null), propDefs);
        }
    }

    if (pk == null) {
        pk = model.pk;
        if (!propDefs[pk]) {
            propDefs = R.assoc('createdAt', typeof model.pkProp === 'string' ? props[model.pkProp] : model.pkProp, propDefs);
        }
    }

    // if (pk == null) {
    //     pk = Object.keys(propDefs).reduce((pk, key) => {
    //         if (pk) {
    //             return pk;
    //         } else if (propDefs[key].meta.pk) {
    //             return key;
    //         }
    //
    //         return pk;
    //     }, null);
    // }

    const associations = R.filter((v) => v.isAssociation, propDefs);
    const storedProperties = R.omit(Object.keys(associations), propDefs);

    const schema = R.is(Schema, propDefs) ? propDefs : Schema(propDefs);


    const Model = createNamedFunction(name, function(data) {
        const out = {
            __proto__: Model.prototype,
            get [authorization$]() { return data[authorization$] || null; },
            get [changeset$]() { return data[changeset$] || new Set(); },
        };
        const loaded = schema.load(data);
        Object.keys(loaded).forEach((key) => {
            Object.defineProperty(out, key, {
                value: loaded[key],
                writable: false,
                enumerable: true,
            });
        });
        return out;
    }, ['data']);

    Model.id = name;
    Model.pk = pk;
    Model.collectionName = collectionName;
    Model.indexes = indexes;
    Model.storageName = storageName;
    Model.repo = Repo(storageName, collectionName);
    Model._associations = associations;
    Model._storedProperties = storedProperties;

    Object.defineProperty(Model, 'schema', {
        configurable: false,
        enumerable: true,
        get: () => schema,
    });

    Object.defineProperty(Model, 'default', {
        configurable: false,
        enumerable: true,
        get: () => Model(schema.default),
    });

    mergeDescriptors(Model.prototype, methods);
    mergeDescriptors(Model.prototype, {
        get id() { return this[pk]; },
        validate() { return schema.validate(this); },
        get isvalid() { return schema.isvalid(this); },
        update(values) {
            const loaded = schema.update(values);
            const changeset = new Set(this[changeset$]);
            Object.keys(loaded).forEach((key) => {
                changeset.add(key);
            });

            return Model(Object.assign({}, this, loaded, {[changeset$]: changeset}));
        },
        set(key, value) { return this.update({[key]: value}); },
        unload() { return schema.unload(this); },
        get [Symbol.toStringTag]() { return Model.id; },
        get ['json']() {
            return this.toJSON();
        },
        toJSON() {
            const mask = this.hasauth ? this[authorization$].mask(Model, 'view', this) : [];
            const json = Object.keys(schema.properties).reduce((res, key) => {
                if (mask.includes(key)) {
                    return res;
                }
                if (!schema.properties[key].isprotected && typeof this[key] !== 'undefined') {
                    res[key] = schema.properties[key].jsonify(this[key]);
                }
                return res;
            }, {});

            return json;
        },
        get hasauth() {
            return !!this[authorization$];
        },
        get auth() {
            return this[authorization$];
        },
        withAuth(auth) {
            return Model(Object.assign({}, this, {[authorization$]: auth}));
        },
        changed(key) {
            return this[changeset$].has(key);
        },
    });


    registry.set(name, Model);
    EventEmitter(Model);

    if (timestamps) {
        Model.on('create', (model) => {
            return Future.of(model.set('createdAt', new Date()));
        });
        Model.on('save', (model) => {
            return Future.of(model.set('modifiedAt', new Date()));
        });
    }

    [
        'create',
        'update',
        'save',
        'delete',
        'created',
        'updated',
        'saved',
        'deleted',
    ].forEach(key => {
        if (R.is(Function, hook[key])) {
            Model.on(key, hook[key]);
        }
    });

    function prepareInsert(model) {
        return Model.emit('create', model)
            .chain(Model.emit('save'))
            // .map((model) => {throw(new Error(Model.show(model)))})
            .chain((model) => Future((reject, resolve) => {
                if (!model.isvalid) {
                    return reject(ValidationError(model, model.validate()));
                }

                return resolve(model);
            }))
        ;
    }

    function prepareUpdate(model) {
        return Model.emit('update', model)
            .chain(Model.emit('save'))
            .chain((model) => Future((reject, resolve) => {
                if (!model.isvalid) {
                    return reject(ValidationError(model, model.validate()));
                }

                return resolve(model);
            }))
        ;
    }

    function prepareDelete(model) {
        return Model.emit('delete', model);
    }

    // function findWithAssociated(query, options) {
    //     debug('find with associated', query, options);
    //     const {include} = options;
    //     const associationPipeline = Model._buildAssociationPipeline(include);
    //     let pipeline = [{$match: query}];
    //     if (options.sort) {
    //         pipeline = R.concat(pipeline, [{$sort: options.sort}]);
    //     }
    //     if (options.skip) {
    //         pipeline = R.concat(pipeline, [{$skip: options.skip}]);
    //     }
    //     if (options.limit) {
    //         pipeline = R.concat(pipeline, [{$limit: options.limit}]);
    //     }
    //     pipeline = R.concat(pipeline, associationPipeline);
    //
    //     return Model.repo.aggregate(pipeline)
    //         .map(R.map(R.compose(Model, init)));
    // }
    //
    // Model._buildAssociationPipeline = (included) => {
    //     const tlIncluded = R.uniq(R.map(include => R.head(include.split('.')), included));
    //     const associationPipeline = R.flatten(
    //         R.map((include) => associations[include].buildPipeline(Model, include), tlIncluded)
    //     );
    //
    //     return associationPipeline;
    // };

    function loadAssociated(models, options) {
        const {include = []} = options;

        const toplevelInclude = Array.from(include.reduce((set, key) => {
            if (!R.is(String, key)) {
                return set;
            }

            set.add(R.head(key.split('.')));

            return set;
        }, new Set())).filter((key) => Boolean(Model._associations[key]));

        return Future.parallel(5, toplevelInclude.map((key) => {
            const association = Model._associations[key];
            const {
                associatedWith,
                localField,
                foreignField,
                unwind,
            } = association.meta;

            const AssociatedModel = registry.get(associatedWith);

            const localValues = models.reduce((res, model) => res.concat(unwind ? model[localField] : [model[localField]]), []);
            const query = {[foreignField]: {$in: Array.from(new Set(localValues))}};
            const test = new RegExp(`^${key}\\.`);
            const subInclude = Array.from(include.reduce((set, key) => {
                if (R.is(String, key) && test.test(key)) {
                    set.add(key.replace(test, ''));
                }

                return set;
            }, new Set()));

            const subOptions = Object.assign({}, options, {include: subInclude});

            return AssociatedModel.findMany(query, subOptions)
                .map((results) => [key, results]);

        })).map((associated) => {
        // debug('associated', associated);
            // Recombine
            return associated.reduce((models, [key, values]) => {
                const association = Model._associations[key];
                const {
                    localField,
                    foreignField,
                    single,
                } = association.meta;

                const foreignFieldMap = values.reduce((map, value) => {
                    // TODO: evaluate whether stringification is valid here...
                    const foreignValue = String(value[foreignField]);

                    if (!single && !map.has(foreignValue)) {
                        map.set(foreignValue, []);
                    }

                    if (single) {
                        map.set(foreignValue, value);
                    } else {
                        map.get(foreignValue).push(value);
                    }

                    return map;
                }, new Map());

                return models.map((model) => {
                    // TODO: evaluate whether stringification is valid here...
                    const localValue = String(model[localField]);
                    let setValue;
                    if (foreignFieldMap.has(localValue)) {
                        setValue = foreignFieldMap.get(localValue);
                    } else if (single) {
                        setValue = null;
                    } else {
                        setValue = [];
                    }

                    return model.update({[key]: setValue});
                });
            }, models);
        });
    }

    function checkSoftDelete(query, options) {
        if (softdelete && !options.includeDeleted) {
            query = appendQuery({$or: [
                {deletedAt: {$exists: false}},
                {deletedAt: null},
            ]});
        }

        return query;
    }

    Model.findMany = function findMany(query, options = {}) {
        query = checkSoftDelete(query, options);
        return Model.repo.findMany(query, options)
            .map(R.map(R.compose(Model, init)))
            .chain((docs) => loadAssociated(docs, options))
        ;
    };

    Model.findOne = function findOne(query, options = {}) {
        query = checkSoftDelete(query, options);
        const condition = R.cond([
            [R.isNil, R.always(null)],
            [R.T, R.compose(Model, init)],
        ]);

        return Model.repo.findOne(query, options)
            .map((doc) => condition(doc))
            .chain((doc) => {
                if (R.isNil(doc)) {
                    return Future.of(doc);
                }

                return loadAssociated([doc], options).map(R.head);
            })
        ;
    };

    Model.findOneOrReject = function findOneOrReject(query, options = {}) {
        query = checkSoftDelete(query, options);

        return Model.repo.findOne(query, options)
            .chain(doc => doc == null
                ? Future.reject(Error('Could not find the record.'))
                : Future.of(doc))
            .map(R.compose(Model, init))
            .chain((doc) => loadAssociated([doc], options))
            .map(R.head)
        ;
    };

    Model.paginate = function paginate(query, pageSize, pageNum) {
        query = checkSoftDelete(query, options);

        return Model.repo.findMany(query, {limit: pageSize, skip: pageSize * pageNum})
            .map(R.map(R.compose(Model, init)))
            .chain((docs) => loadAssociated(docs, options))
        ;
    };

    Model.paginateSorted = function paginateSorted(query, pageSize, pageNum, sort) {
        query = checkSoftDelete(query, options);

        return Model.repo.findMany(query, {limit: pageSize, skip: pageSize * pageNum, sort})
            .map(R.map(R.compose(Model, init)))
            .chain((docs) => loadAssociated(docs, options))
        ;
    };

    Model.insertOne = function insertOne(model) {
        return prepareInsert(model)
            .map((model) => model.unload())
            .chain(Model.repo.insertOne.bind(Model.repo))
            .map((result) => R.map(R.compose(Model, init), result.ops)[0])
            .chain(Model.emit('created')).chain(Model.emit('saved'));
    };

    Model.insertMany = function insertMany(models) {
        return Future.parallel(5, R.map(prepareInsert, models))
            .map(R.map((model) => model.unload()))
            .chain(Model.repo.insertMany.bind(Model.repo.insertMany))
            .map((result) => R.map(R.compose(Model, init), result.ops))
            .chain(R.map(Model.emit('created'))).chain(R.map(Model.emit('saved')));
    };

    Model.updateOne = function updateOne(model) {
        const prepared = prepareUpdate(model);
        let preparedModel;
        return prepared
            .map((model) => {preparedModel = model; return model;})
            .map((model) => model.unload())
            .chain(Model.repo.updateOne.bind(Model.repo, {[Model.pk]: model[Model.pk]}))
            .chain(function(result) {
                if (result.matchedCount < 1) {
                    return Future.reject(ValidationError(
                        model,
                        {[Model.pk]: 'model does not exist'},
                        Model.name + ' does not exist in the database'
                    ));
                }
                return Future.of(preparedModel);
            }).chain(Model.emit('updated')).chain(Model.emit('saved'))
        ;
    };

    Model.deleteOne = function deleteOne(model) {
        const prepared = prepareDelete(model);
        return prepared.chain((model) => {
            if (softdelete) {
                const deletedModel = model.update({deletedAt: new Date()});
                return Model.repo.updateOne(deletedModel)
                    .map((result) => deletedModel);
            } else {
                return Model.repo.deleteOne({[Model.pk]: model[Model.pk]})
                    .map((result) => model);
            }
        }).chain(Model.emit('deleted'));
    };

    Model.deleteMany = function deleteMany(models) {
        const prepared = Future.parallel(5, (models.map(prepareDelete)));
        return prepared.chain((models) => {
            const ids = models.map((model) => model.id);
            if (softdelete) {
                const now = new Date();
                const deletedModels = models.map((model) => model.update({deletedAt: now}));

                return Model.repo.updateMany({[Model.pk]: {$in: ids}}, {$set: {deletedAt: now}})
                    .map((result) => deletedModels);
            } else {
                return Model.repo.deleteMany({[Model.pk]: {$in: ids}})
                    .map((result) => models);
            }

        }).chain((models) => R.parallel(5, models.map(Model.emit('deleted'))));
    };

    return Model;
}

function extend(old, extension) {
    const {
        props = {},
        allowDuplicateNames,
        calculateCollectionName,
        storageName = old.storageName,
        pk = old.pk,
        pkProp = old.pkProp,
    } = extension;

    const model = {};
    const registry = new Map(old.registry || []);
    const {
        Association,
        belongsToMany,
        belongsToOne,
        hasMany,
        hasOne,
        embed,
    } = require('./associations')(registry.get.bind(registry));

    const finalProps = R.merge({
        belongsToMany,
        belongsToOne,
        hasMany,
        hasOne,
        embed,
        Association,
    }, props);

    model.extend = R.partial(extend, [model]);
    model.Schema = Schema;
    model.props = R.merge(old.props, finalProps);
    model.allowDuplicateNames = R.is(Boolean, allowDuplicateNames) ? allowDuplicateNames : old.allowDuplicateNames;
    model.create = R.partial(createModel, [model, registry]);
    model.calculateCollectionName = R.is(Function, calculateCollectionName) ? calculateCollectionName : old.calculateCollectionName;
    model.storageName = storageName;
    model.pk = pk;
    model.pkProp = pkProp;

    return model;
}

const defaults = {
    props,
    storageName: 'storage',
    allowDuplicateNames: false,
    pk: '_id',
    pkProp: 'any',
    calculateCollectionName(name) {
        return pluralize(R.concat(R.toLower(R.head(name)), R.tail(name)));
    },
};

module.exports = extend(defaults, {});
