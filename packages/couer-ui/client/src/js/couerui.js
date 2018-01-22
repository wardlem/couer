const View = require('./View.js');

function CouerUI(rootel, appdata) {
    return {
        rootel,
        appdata,
        __proto__: CouerUI.prototype,
    };
}

CouerUI.prototype.run = function() {
    const SessionMiddleware = require('./middleware/SessionMiddleware.js');

    var m = require('mithril');
    var appdata = this.appdata;
    console.log('appdata', appdata);

    var views = (appdata.views || []).map(function(def) {
        const view = View(def);
        return view;
    });
    var base = appdata.basepath || '';

    const loginView = View(appdata.loginview);

    console.log('loginview', loginView);

    var Layout = require('./views/LayoutView.js');

    const routes = views.reduce(function(res, route) {

        res[route.path] = {
            view: function() {
                const sessionProps = {LoginView: loginView, loginRequired: route.loginRequired !== 'false'};
                const layoutProps = Object.assign({}, appdata, {activeMenu: route.activeMenu});
                return m(SessionMiddleware, sessionProps, m(Layout, layoutProps, m(route)));
            },
        };
        return res;
    }, {});

    m.route.prefix(base);
    m.route(this.rootel, appdata.defaultRoute || '/', routes);
};

module.exports = CouerUI;
