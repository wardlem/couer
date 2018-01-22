const m = require('mithril');

function DashboardView(def) {
    return {
        path: def.path,
        view: () => m('p', 'A Dashboard for you sir'),
    };
}

module.exports = DashboardView;
