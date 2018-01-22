const debug = require('debug')('core:ui');
const pathlib = require('path');
const trimTrailingSlash = require('../server/utils/trimTrailingSlash');

const {router, Pipeline} = require('../server');
const {done, next} = Pipeline;

const R = require('ramda');

const genhtml = require('./genhtml');
const gencss = require('./gencss');
const genjs = require('./genjs');

module.exports = exports = function createUI(options, definitions) {
    const {
        rooturl = 'http://localhost:8081',
        apiurl,
        basepath = '/',
        title = 'Couer Application',
        manageMenuTitle = 'Manage',
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

    // const defPipelines = definitions.map(
    //     (def) => def.pipeline(trimTrailingSlash(`${rooturl}${basepath}`), formatters)
    // );

    const systemjspath = pathlib.dirname(require.resolve('systemjs'));
    debug('systemjspath', systemjspath);

    return router.scope(basepath, Pipeline.build([
        router.static('/_system', systemjspath),
        router.scope('/_data', [
            router.get('/system.js', (req, res) => {
            }),
            router.get('/appdata.js', (req, res) => {
                const data = {views: viewdefs, menulinks, contextmenus, title, loginview};
                const js = genjs(data);
                return done(req, res.header('Content-Type', 'application/javascript').send(js));
            }),
            router.get('/appstyles.css', (req, res) => {
                const css = gencss({});
                return done(req, res.header('Content-Type', 'text/css').send(css));
            }),
        ]),
        router.static('/_skin', pathlib.resolve(__dirname, '../../skin/dist')),
        router.static('/_resource', pathlib.resolve(__dirname, './client/src')),
        (req, res) => {
            // no post routes here
            if (!req.ismethod('GET')) {
                return next(req, res);
            }
            debug('root:', trimTrailingSlash(`${rooturl}${basepath}`));

            const data = {
                title,
                root: trimTrailingSlash(`${rooturl}${basepath}`),
            };
            const html = genhtml(data);
            return done(req, res.html(html));
        },
    ]));
};

// exports.ModelApi = require('./modelapi');
