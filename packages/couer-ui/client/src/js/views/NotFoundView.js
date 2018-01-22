const m = require('mithril');

function NotFoundView(def) {
    return {
        path: def.path,
        view: () => m('p', 'Sorry... Not found here'),
    };
}

module.exports = NotFoundView;
