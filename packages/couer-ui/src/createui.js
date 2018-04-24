const debug = require('debug')('core:ui');
const {resolve} = require('path');
const {trimTrailingSlash} = require('couer-util');
const mkdirp = require('mkdirp');

const router = require('couer-router');
const Pipeline = router.Pipeline;
const {done, next, error} = Pipeline;

const R = require('ramda');
const Future = require('fluture');

const genhtml = require('./genhtml');
const gencss = require('./gencss');
const genjs = require('./genjs');

const {tmpdir} = require('os');
const {cwd} = process;
const fs = require('fs');
module.exports = exports = function createUI(options, definitions) {
    const {
        rooturl = 'http://localhost:8081',
        apiurl,
        basepath = '/',
        title = 'Couer Application',
        manageMenuTitle = 'Manage',
        clientPaths = {},
        themepath = resolve(__dirname, '../client/src/css/themes/couer/theme.css'),
    } = options;

    const ui = {
        title,
        basepath: R.last(basepath) === '/' ? R.init(basepath) : basepath,
        apiurl,
        definitions,
    };

    definitions.forEach((def) => {
        Object.defineProperty(def, 'ui', {
            get: function() { return ui; },
            enumerable: true,
        });
    });

    const viewdefs = definitions.reduce((res, def) => {
        const data = def.definition(ui);

        return res.concat(Array.isArray(data) ? data : [data]);
    }, []);

    const viewpaths = Object.assign({
        table: resolve(__dirname, '../client/src/js/views/TableView'),
        // display: resolve(__dirname, '../client/src/js/views/DisplayView.js'),
        form: resolve(__dirname, '../client/src/js/views/FormView.js'),
        // dashboard: resolve(__dirname, '../client/src/js/views/DashboardView.js'),
        // 404: resolve(__dirname, '../client/src/js/views/NotFoundView.js'),
        // login: resolve(__dirname, '../client/src/js/views/LoginView.js'),
    }, clientPaths);


    const menulinks = [[manageMenuTitle, viewdefs.reduce((res, def) => {
        if (!def.menuTitle) {
            return res;
        }

        return res.concat([[def.menuTitle, def.path, def.menuIcon || '']]);
    }, [])]];

    const loginview = viewdefs.reduce((res, def) => {
        if (!res && def.islogin) {
            return def;
        }

        return res;
    }, null);

    const contextmenus = viewdefs.reduce((res, def) => {
        if (def.contextKey) {
            if (!res[def.contextKey]) {
                res[def.contextKey] = [def.contextKey, []];
            }

            res[def.contextKey][1].push([def.contextTitle, def.path, def.contextIcon || '']);

        }

        return res;
    }, {});

    const data = {views: viewdefs, menulinks, contextmenus, title, loginview, themepath};
    const tmpd = resolve(tmpdir(), `./${process.pid}-${Date.now()}`);
    const tmpjsd = resolve(tmpd, './js');
    const dest = resolve(cwd(), './client');
    const destjsd = resolve(dest, './js');
    const destcssd = resolve(dest, './css');
    const destjsfile = resolve(destjsd, './index.js');
    const destcssfile = resolve(destcssd, './index.css');
    const tmpjs = resolve(tmpjsd, './index.js');
    const destassets = resolve(dest, './assets');

    const js = genjs(data, viewpaths);

    const mkdirs = Future.parallel(1, [
        Future.node((done) => mkdirp(destjsd, done)),
        Future.node((done) => mkdirp(destcssd, done)),
        Future.node((done) => mkdirp(destassets, done)),
        Future.node((done) => mkdirp(tmpjsd, done)),
    ]);

    let buildjs =
        mkdirs.chain(() => Future.node((done) => fs.writeFile(tmpjs, js, done))).chain(() => {

            const browserify = require('browserify');
            const b = browserify({
                // builtins,
            });
            b.add(tmpjs);
            const cssModulesify = require('css-modulesify');
            const FileSystemLoader = require('css-modulesify/file-system-loader');
            const originalFetch = FileSystemLoader.prototype.fetch;
            FileSystemLoader.prototype.fetch = function(_newPath, relativeTo, _trace) {
                if (_newPath.replace(/^["']|["']$/g, '') === '!theme') {
                    _newPath = themepath;
                }

                return originalFetch.call(this, _newPath, relativeTo, _trace);
            };

            // const assets = require('postcss-assets');

            b.plugin(cssModulesify, {
                rootDir: '/',
                output: destcssfile,
                generateScopedName: cssModulesify.generateShortName,
                before: [
                    'postcss-import',
                    // 'postcss-mixins',
                    // 'postcss-simple-vars',
                    'postcss-nested',
                ],
                after: [
                    // 'postcss-conditionals',
                    'postcss-calc',
                    'postcss-color-function',
                    // assets({
                    //     loadPaths: [resolve(__dirname, '../client/src/assets')],
                    // }),
                    // 'lost',
                ],
            });

            return Future.node(done => b.bundle(done))
                .chain((buffer) => {
                    return Future.node((done) => fs.writeFile(destjsfile, buffer, done));
                })
            ;
        })
    ;

    buildjs = Future.cache(buildjs);

    const staticServer = router.static('/', dest);

    return router.scope(basepath, Pipeline.build([
        router.scope('/_resource', Pipeline.build([
            (req, res) => buildjs.chain(() => staticServer(req, res)),
        ])),
        (req, res) => {
            // no post routes here
            if (!req.ismethod('GET')) {
                return next(req, res);
            }

            const root = trimTrailingSlash(`${rooturl}${basepath}`);
            debug('root:', root);

            const data = {
                title,
                root,
            };
            const html = genhtml(data);
            return done(req, res.html(html));
        },
    ]));
};

// exports.ModelApi = require('./modelapi');
