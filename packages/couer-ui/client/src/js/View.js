const debug = require('debug')('couer:View');

function View(def) {
    const view = getTypedView(def);

    view.activeMenu = def.activeMenu;

    return view;
}

function getTypedView(def) {
    if (Couer.views[def.type]) {
        return Couer.views[def.type](def, Couer.theme);
    }

    return {
        path: def.path,
        view() {},
    };
}

module.exports = View;
