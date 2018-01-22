const m = require('mithril');
function DisplayView(def) {
    return {
        path: def.path,
        view: () => m('p', 'A view for you sir'),
    };
}

module.exports = DisplayView;
