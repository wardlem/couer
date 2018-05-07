const R = require('ramda');
const Future = require('fluture');
const mergeDescriptors = require('merge-descriptors');
const createHttpError = require('couer-httpserver/src/errors/createHttpError');
const ValidationError = require('couer-odm/src/errors/ValidationError');
const debug = require('debug')('couer:modelapi');

const {router, Pipeline} = require('couer-httpserver');

const stringifySort = require('./util/stringifySort');
const processQuery = require('./util/processQuery');
const stringifyQuery = require('./util/stringifyQuery');
const stringifyInclude = require('./util/stringifyInclude');
const appendQuery = require('couer-odm/src/util/appendQuery');


function ModelApi(options) {
    const Model = options.model;
    const {
        basepath = `/${Model.collectionName.toLowerCase()}`,
        allowedIncludes = Model._associations,
        defaultIncludes = [],
        formatters = require('./formatters').defaults,
        defaultPageSize = 20,
        maxPageSize = 100,
        defaultSort = '-createdAt',
        sortKeys = ['createdAt'],
    } = options;

    return {
        Model,
        basepath,
        allowedIncludes,
        defaultIncludes,
        formatters,
        defaultPageSize,
        maxPageSize,
        defaultSort,
        sortKeys,
        __proto__: ModelApi.prototype,
    };
}

mergeDescriptors(ModelApi.prototype, {
    pipeline(rooturl, formatters) {
        const {Model} = this;
        formatters = Object.assign({}, formatters, this.formatters);

        return router.scope(this.basepath, Pipeline.build([
            router.get('/', (req, res) => {

                const authorization = req.data.authorization || null;

                return (authorization ? authorization.gate(Model, 'view', null, null) : Future.of(null))
                    .chain(() => {
                        const query = processQuery(Model.schema, req.query.filter || {});
                        if (R.is(String, query)) {
                            return Pipeline.error(createHttpError(400, query));
                        }

                        const authorizedQuery = this.authorizeQuery(authorization, query);

                        // debug('query: %O', authorizedQuery);

                        const options = {};
                        return this.processIncludes(req, authorization)
                            .chain((include) => {
                                options.include = include;
                                return this.processSort(req);
                            })
                            .chain((sort) => {
                                options.sort = sort;
                                return this.processPagination(req);
                            })
                            .chain((pagination) => {
                                options.limit = pagination.size;
                                options.skip = pagination.size * (pagination.number - 1);
                                let _count;
                                return Model.repo.count(authorizedQuery)
                                    .chain((count) => {
                                        _count = count;
                                        pagination = R.assoc('count', Math.ceil(count / pagination.size), pagination);
                                        return this.Model.findMany(authorizedQuery, options);
                                    })
                                    .map(R.map(this.postProcessRecord.bind(this, authorization)))
                                    .map((records) => {
                                        return {
                                            data: records.map(r => r.json),
                                            meta: {
                                                total: _count,
                                                page: pagination,
                                            },
                                            links: this.links(rooturl, undefined, pagination, query, options.sort, options.include),
                                        };
                                    })
                                    .chain((data) => {
                                        return res.format(req, data, formatters);
                                    })
                                ;
                            })
                        ;
                    })
                ;
            }),
            router.get('/:id', (req, res) => {
                const id = Model.schema.properties[Model.pk].load(req.params.id);
                if (!Model.schema.properties[Model.pk].isvalid(id)) {
                    // return Pipeline.error(createHttpError(400, 'Invalid identifier'));
                    return Pipeline.next(req, res);
                }

                const authorization = req.data.authorization || null;

                return (authorization ? authorization.gate(Model, 'view', null, null) : Future.of(null))
                    .chain(() => {
                        const query = {[Model.pk]: id};

                        const authorizedQuery = this.authorizeQuery(authorization, query);

                        return this.processIncludes(req)
                            .chain((include) => {
                                const options = {include};
                                return this.Model.findOneOrReject(authorizedQuery, options)
                                    .map(this.postProcessRecord.bind(this, authorization))
                                    .map((record) => {
                                        return {
                                            data: record ? record.json : null,
                                            links: this.links(rooturl, id, undefined, undefined, undefined, options.include),
                                        };
                                    })
                                    .chainRej((reason) => {
                                        return Pipeline.error(createHttpError(reason.statusCode || 404, reason.message));
                                    })
                                    .chain((data) => {
                                        return res.format(req, data, formatters);
                                    })
                                ;
                            })
                        ;
                    })
                ;
            }),
            router.post('/', (req, res) => {
                const model = Model(req.body);

                const authorization = req.data.authorization || null;

                debug('post auth', authorization);

                return (authorization ? authorization.gate(Model, 'create', null, model) : Future.of(model))
                    .chain((model) => {
                        return Model.insertOne(model)
                            .chainRej((reason) => {
                                if (reason instanceof ValidationError) {
                                    return Pipeline.error(createHttpError(400, reason.message, {details: reason.failures}));
                                } else {
                                    return Pipeline.error(reason);
                                }
                            })
                            .map(this.postProcessRecord.bind(this, authorization))
                            .map((record) => {
                                return {
                                    data: record.json,
                                };
                            })
                            .chain((data) => {
                                return res.header('Location', `${rooturl}${this.basepath}/${data.data.id}`).status(201).format(req, data, formatters);
                            })
                        ;
                    })
                ;
            }),

            router.patch('/:id', (req, res) => {
                const id = Model.schema.properties[Model.pk].load(req.params.id);
                if (!Model.schema.properties[Model.pk].isvalid(id)) {
                    // return Pipeline.error(createHttpError(400, 'Invalid identifier'));
                    return Pipeline.next(req, res);
                }

                const authorization = req.data.authorization || null;

                const query = {[Model.pk]: id};
                const authorizedQuery = this.authorizeQuery(authorization, query);
                const options = {};
                return this.Model.findOneOrReject(authorizedQuery, options)
                    .chainRej((reason) => {
                        return Pipeline.error(createHttpError(reason.statusCode || 404, reason.message));
                    })
                    .chain((record) => {
                        const original = record;
                        record = record.update(req.body);

                        return authorization ? authorization.gate(Model, 'update', original, record) : Future.of(record);
                    })
                    .chain(Model.updateOne)
                    .chainRej((reason) => {
                        if (reason instanceof ValidationError) {
                            return Pipeline.error(createHttpError(400, reason.message, {details: reason.failures}));
                        } else {
                            return Pipeline.error(reason);
                        }
                    })
                    .map(this.postProcessRecord.bind(this, authorization))
                    .map((record) => {
                        return {
                            data: record.json,
                        };
                    })
                    .chain((data) => {
                        return res.status(200).format(req, data, formatters);
                    })
                ;

            }),
            router.delete('/:id', (req, res) => {
                const id = Model.schema.properties[Model.pk].load(req.params.id);
                if (!Model.schema.properties[Model.pk].isvalid(id)) {
                    // return Pipeline.error(createHttpError(400, 'Invalid identifier'));
                    return Pipeline.next(req, res);
                }

                const authorization = req.data.authorization || null;

                const query = {[Model.pk]: id};
                const authorizedQuery = this.authorizeQuery(authorization, query);

                const options = {};
                return this.Model.findOneOrReject(authorizedQuery, options)
                    .chainRej((reason) => {
                        return Pipeline.error(createHttpError(reason.statusCode || 404, reason.message));
                    })
                    .chain((record) => {
                        return authorization ? authorization.gate(Model, 'delete', record, record) : Future.of(record);
                    })
                    .chain(Model.deleteOne)
                    .map((record) => {
                        return {
                            data: record.json,
                        };
                    })
                    .chain((data) => {
                        return res.status(200).format(req, data, formatters);
                    })
                ;
            }),
        ].concat(this.associatedPipeline(rooturl, formatters))));
    },
    associatedPipeline(rooturl, formatters) {
        const {allowedIncludes, Model} = this;

        return allowedIncludes.reduce((pipeline, includeKey) => {
            const includeProp = Model._associations[includeKey];
            if (!includeProp) {
                return pipeline;
            }

            const AssociatedModel = includeProp.getAssociatedModel();
            const includeApi = this.api.definitions.reduce((foundDef, def) => {
                if (!foundDef && def.Model === AssociatedModel) {
                    return def;
                }

                return foundDef;
            }, null);

            return pipeline.concat([
                router.get(`/:id/${includeKey}`, (req, res) => {
                    const id = Model.schema.properties[Model.pk].load(req.params.id);
                    if (!Model.schema.properties[Model.pk].isvalid(id)) {
                        // return Pipeline.error(createHttpError(400, 'Invalid identifier'));
                        return Pipeline.next(req, res);
                    }

                    const authorization = req.data.authorization || null;

                    return (authorization ? authorization.gate(Model, 'view', null, null) : Future.of(null))
                        .chain(() => authorization ? authorization.gate(AssociatedModel, 'view', null, null) : Future.of(null))
                        .chain(() => {
                            const query = {[Model.pk]: id};

                            const authorizedQuery = this.authorizeQuery(authorization, query);

                            return (includeApi ? includeApi.processIncludes(req, authorization) : Future.of([]))
                                .chain((include) => {
                                    return this.Model.findOneOrReject(authorizedQuery)
                                        .chain((model) => {
                                            const reqQuery = processQuery(AssociatedModel.schema, req.query.filter || {});
                                            const includeQuery = appendQuery(reqQuery, {[includeProp.meta.foreignField]: model[includeProp.meta.localField]});
                                            const authorizedIncludeQuery = this.authorizeQuery(authorization, includeQuery, AssociatedModel);
                                            const options = {include};

                                            if (includeProp.meta.single) {
                                                return AssociatedModel.findOne(authorizedIncludeQuery, options)
                                                    .map((record) => this.postProcessRecord(authorization, record, AssociatedModel))
                                                    .map((record) => {
                                                        const links = {
                                                            root: {
                                                                description: 'The canonical link to the current root resource',
                                                                href: `${rooturl}${this.basepath}/${id}`,
                                                            },
                                                        };

                                                        if (includeApi  && record) {
                                                            Object.assign(links, includeApi.links(rooturl, id, undefined, undefined, undefined, options.include));
                                                        } else {
                                                            Object.assign(links, {

                                                                self: {
                                                                    description: 'The canonical link to the current resource',
                                                                    href: `${rooturl}${this.basepath}/${id}/${includeKey}`,
                                                                },
                                                            });
                                                        }


                                                        return {
                                                            data: record ? record.json : record,
                                                            links,
                                                        };
                                                    });
                                            } else {
                                                return this.processSort(req)
                                                    .chain((sort) => {
                                                        options.sort = sort;
                                                        return this.processPagination(req);
                                                    })
                                                    .chain((pagination) => {
                                                        options.limit = pagination.size;
                                                        options.skip = pagination.size * (pagination.number - 1);
                                                        let _count;
                                                        return AssociatedModel.repo.count(authorizedIncludeQuery)
                                                            .chain((count) => {
                                                                _count = count;
                                                                pagination = R.assoc('count', Math.ceil(count / pagination.size), pagination);
                                                                return AssociatedModel.findMany(authorizedIncludeQuery, options);
                                                            })
                                                            .map(R.map((record) => this.postProcessRecord(authorization, record, AssociatedModel)))
                                                            .map((records) => {
                                                                const links = {
                                                                    root: {
                                                                        description: 'The canonical link to the current root resource',
                                                                        href: `${rooturl}${this.basepath}/${id}`,
                                                                    },
                                                                };

                                                                if (includeApi) {
                                                                    Object.assign(links, includeApi.links(rooturl, undefined, pagination, includeQuery, options.sort, options.include));
                                                                } else {
                                                                    const {sort, query, include} = options;
                                                                    const page = pagination;
                                                                    let queryStr = (query && Object.keys(query).length) ? `&${stringifyQuery(query)}` : '';
                                                                    let sortStr = `&sort=${stringifySort(sort)}`;
                                                                    let includeQuery = stringifyInclude(include);
                                                                    let includeStr = includeQuery ? `&${includeQuery}` : '';
                                                                    Object.assign(links, {
                                                                        self: {
                                                                            description: 'The canonical link to the current resource list',
                                                                            href: `${rooturl}${this.basepath}/${id}/${includeKey}?page[number]=${page.number}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                                                                        },
                                                                        first: {
                                                                            description: 'The first page for the current resource list',
                                                                            href: `${rooturl}${this.basepath}/${id}/${includeKey}?page[number]=1&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                                                                        },
                                                                        last: {
                                                                            description: 'The last page for the current resource list',
                                                                            href: `${rooturl}${this.basepath}/${id}/${includeKey}?page[number]=${page.count}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                                                                        },
                                                                        prev: {
                                                                            description: 'The previous page for the current resource list',
                                                                            href: page.number == 1 ? null : `${rooturl}${this.basepath}/${id}/${includeKey}?page[number]=${page.count - 1}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                                                                        },
                                                                        next: {
                                                                            description: 'The next page for the current resource list',
                                                                            href: page.number >= page.count ? null : `${rooturl}${this.basepath}/${id}/${includeKey}?page[number]=${page.count + 1}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                                                                        },
                                                                    });
                                                                }

                                                                return {
                                                                    data: records.map(r => r.json),
                                                                    meta: {
                                                                        total: _count,
                                                                        page: pagination,
                                                                    },
                                                                    links,
                                                                };
                                                            })
                                                        ;
                                                    })
                                                ;
                                            }
                                        })
                                        .chain((data) => {
                                            return res.format(req, data, formatters);
                                        })
                                    ;
                                })
                            ;
                        })
                    ;
                }),
            ]);
        }, []);
    },
    links(rooturl, id, page, query, sort, include) {
        let includeQuery = stringifyInclude(include);

        if (!id) {
            let queryStr = (query && Object.keys(query).length) ? `&${stringifyQuery(query)}` : '';
            let sortStr = `&sort=${stringifySort(sort)}`;
            let includeStr = includeQuery ? `&${includeQuery}` : '';
            return {
                self: {
                    description: 'The canonical link to the current resource list',
                    href: `${rooturl}${this.basepath}?page[number]=${page.number}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                },
                first: {
                    description: 'The first page for the current resource list',
                    href: `${rooturl}${this.basepath}?page[number]=1&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                },
                last: {
                    description: 'The last page for the current resource list',
                    href: `${rooturl}${this.basepath}?page[number]=${page.count}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                },
                prev: {
                    description: 'The previous page for the current resource list',
                    href: page.number == 1 ? null : `${rooturl}${this.basepath}?page[number]=${page.count - 1}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                },
                next: {
                    description: 'The next page for the current resource list',
                    href: page.number >= page.count ? null : `${rooturl}${this.basepath}?page[number]=${page.count + 1}&page[size]=${page.size}${sortStr}${queryStr}${includeStr}`,
                },
            };
        }

        const relatedLinks = this.allowedIncludes.reduce((res, key) => {
            // const rel = this.Model.schema.properties[key];
            if (key.indexOf('.') !== -1) {
                return res;
            }
            res[key] = {
                description: `Link to the related ${key} for the current resource`,
                href: `${rooturl}${this.basepath}/${id}/${key}`,
            };
            return res;
        }, {});

        let includeStr = includeQuery ? `?${includeQuery}` : '';

        return Object.assign(relatedLinks, {
            self: {
                description: 'The canonical link to the current resource',
                href: `${rooturl}${this.basepath}/${id}${includeStr}`,
            },
        });
    },
    authorizeQuery(authorization, query, Model = this.Model) {
        const filter = authorization && authorization.filter(Model, 'view');

        let authorizedQuery = query;
        if (filter && typeof filter === 'object') {
            authorizedQuery = query['$and'] ? Object.assign({}, query, {$and: query['$and'].concat([filter])}) : {$and: [query, filter]};
        }

        return authorizedQuery;
    },
    processIncludes(req, authorization) {
        const {defaultIncludes, allowedIncludes, Model} = this;
        let include = R.isNil(req.query.include) ? defaultIncludes : req.query.include;
        if (!Array.isArray(include)) {
            include = include === '' ? [] : [include];
        }
        if (R.difference(include, allowedIncludes).length) {
            return Pipeline.error(createHttpError(400, 'Invalid Include', {
                details: {
                    invalidIncludes: R.difference(include, allowedIncludes),
                    allowedIncludes,
                },
            }));
        }

        const all = ms => ms.reduce(Future.and, Future.of(true));
        return all(include.map((incl) => {

            let inclPath = incl.split('.');
            let CurrentModel = Model;
            let nextincl = '';
            let outInclPath = [];

            function iter(result) {
                if (inclPath.length === 0) {
                    return Future.of(result);
                }

                [nextincl, ...inclPath] = inclPath;
                outInclPath.push(nextincl);

                const prop = CurrentModel.schema.properties[nextincl];

                if (!prop) {
                    debug('No property found for include: %s', outInclPath.join('.'));
                    return Future.reject(createHttpError(500, 'Internal Server Error'));
                }

                if (!prop.isassociation) {
                    debug('Included property is not an association: %s', incl);
                    return Future.reject(createHttpError(500, 'Internal Server Error'));
                }

                const OtherModel = prop.getAssociatedModel();
                CurrentModel = OtherModel;

                if (authorization) {
                    return authorization.gate(OtherModel, 'view', null, null)
                        .chainRej((reason) => {
                            // TODO: should this instead just be removed from the includes?
                            return Future.reject(createHttpError(403, `You do not have sufficient privileges to view included key ${outInclPath.join('.')}`));
                        })
                        .chain((iter))
                    ;
                }

                return iter(null);
            }

            return iter(null);
        }))
            .chain(() => Future.of(include));
    },
    processPagination(req) {
        const {defaultPageSize, maxPageSize} = this;
        let pagination = R.isNil(req.query.page) ? {number: 1, size: defaultPageSize} : req.query.page;
        if (typeof pagination !== 'object') {
            pagination = {number: parseFloat(pagination), size: defaultPageSize};
        }

        if (R.isNil(pagination.number)) {
            pagination.number = 1;
        }

        if (!Number.isInteger(pagination.number)) {
            if (Number.isInteger(parseFloat(pagination.number))) {
                pagination.number = parseInt(pagination.number);
            } else {
                return Pipeline.error(createHttpError(400, 'Invalid page number (must be an integer)', {details: {provided: req.query.page}}));
            }
        }

        if (!Number.isInteger(pagination.size)) {
            if (Number.isInteger(parseFloat(pagination.size))) {
                pagination.size = parseInt(pagination.size);
            } else {
                return Pipeline.error(createHttpError(400, 'Invalid page size (must be an integer)', {details: {provided: req.query.page}}));
            }
        }

        if (pagination.number < 1) {
            return Pipeline.error(createHttpError(400, 'Invalid page number (must be greater than 0)', {details: {provided: req.query.page}}));
        }

        if (pagination.size < 1 || pagination.size > maxPageSize) {
            return Pipeline.error(createHttpError(400, `Invalid page size (must be between 1 and ${maxPageSize})`, {details: {provided: req.query.page}}));
        }

        return Future.of(pagination);
    },
    processSort(req) {
        const {sort = this.defaultSort} = req.query;
        if (!R.is(String, sort)) {
            return Pipeline.error(createHttpError(400, 'Invalid sort (must be a string)', {details: {provided: req.query.sort}}));
        }

        let sortParts = sort.split(',');

        let sortResult = sortParts.reduce((res, key) => {
            if (typeof res === 'string') {
                return res;
            }

            let isNeg = key[0] === '-';
            if (isNeg) {
                key = R.tail(key);
            }

            if (!key) {
                return 'Invalid sort (key cannot be empty)';
            }

            if (!this.sortKeys.includes(key)) {
                return `Invalid sort (${key} is not a valid sort key)`;
            }

            res[key] = isNeg ? -1 : 1;

            return res;
        }, {});

        if (R.is(String, sortResult)) {
            return Pipeline.error(createHttpError(400, sortResult, {details: {provided: req.query.sort}}));
        }

        return Future.of(sortResult);
    },
    postProcessRecord(authorization, record, Model = this.Model) {
        if (!authorization || !record) {
            return record;
        }

        Object.keys(Model._associations).forEach((key) => {
            if (Array.isArray(record[key])) {
                record = record.update({
                    [key]: record[key].map((otherRecord) => otherRecord.withAuth(authorization)),
                });
            } else if (record[key]) {
                record = record.update({
                    [key]: record[key].withAuth(authorization),
                });
            }
        });

        return record.withAuth(authorization);
    },
});

module.exports = ModelApi;
