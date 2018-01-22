module.exports = function View(def) {
    const view = getTypedView(def);

    view.activeMenu = def.activeMenu;

    return view;
};

function getTypedView(def) {
    switch (def.type) {
        case 'table':
            const TableView = require('./views/TableView.js');
            return TableView(def);
        case 'display':
            const DisplayView = require('./views/DisplayView.js');
            return DisplayView(def);
        case 'form':
            const FormView = require('./views/FormView.js');
            return FormView(def);
        case 'dashboard':
            const DashboardView = require('./views/DashboardView.js');
            return DashboardView(def);
        case '404':
            const NotFoundView = require('./views/NotFoundView.js');
            return NotFoundView(def);
        case 'login':
            const LoginView = require('./views/LoginView.js');
            return LoginView(def);
        default:
            return {
                path: def.path,
                view() {},
            };
    }
}
