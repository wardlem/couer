const m = require('mithril');

const LoadingView = {
    view: function(vnode) {
        const children = vnode.children.length || ['Loading'];
        return m('div', {
            style: {
                padding: '12px 0',
            },
        }, [
            m('.ui.active.inline.centered.text.loader', children),
        ]);
    },
};

module.exports = LoadingView;
