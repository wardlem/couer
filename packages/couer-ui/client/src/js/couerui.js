const debug = require('debug')('couer:CouerUI');
const View = require('./View.js');

function CouerUI(rootel, appdata = window.Couer.appdata) {
    return {
        rootel,
        appdata,
        __proto__: CouerUI.prototype,
    };
}

CouerUI.prototype.run = function() {
    const SessionMiddleware = require('./middleware/SessionMiddleware.js');

    const m = require('mithril');
    const appdata = this.appdata;
    debug('appdata', appdata);


    const views = (appdata.views || []).map(function(def) {
        const view = View(def);
        return view;
    });
    const base = appdata.basepath || '';

    const loginView = View(appdata.loginview);

    const Layout = require('./views/LayoutView.js');

    const routes = views.reduce(function(res, route) {

        if (typeof route.path === 'string') {
            res[route.path] = {
                view: function() {
                    debug('route is:', m.route.get());
                    let path = m.route.get();

                    if (path !== '/' && path.endsWith('/')) {
                        debug('path ends in a slash');
                        path = path.substr(0, path.length - 1);
                        debug('new path:', path);
                        m.route.set(path);
                    }
                    const sessionProps = {LoginView: loginView, loginRequired: route.loginRequired !== 'false'};
                    const layoutProps = Object.assign({}, appdata, {activeMenu: route.activeMenu, view: route});
                    return m(SessionMiddleware, sessionProps, m(Layout, layoutProps));
                },
            };
        }

        return res;
    }, {});

    debug('routes:', routes);
    debug('prefix', base);

    m.route.prefix(base);
    m.route(this.rootel, appdata.defaultRoute || '/', routes);
};

module.exports = CouerUI;
