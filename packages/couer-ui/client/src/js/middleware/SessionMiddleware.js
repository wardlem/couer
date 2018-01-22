const SessionState = require('../state/SessionState.js');
const m = require('mithril');

module.exports = {
    view: function(vnode) {
        const {LoginView, loginRequired = true} = vnode.attrs;

        if (SessionState.isloggedin || !loginRequired) {
            return vnode.children;
        }

        return m(LoginView);
    },
};
