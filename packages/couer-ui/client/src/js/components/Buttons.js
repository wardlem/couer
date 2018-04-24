const m = require('mithril');

const styles = Object.assign(
    {}
    // require('../../css/util.css'),
    // require('../../css/components/button.css')
);

const Buttons = {
    view: (vnode) => {
        const {
            centered = false,
        } = vnode.attrs;

        const c = centered ? `.${styles.centered}` : '';
        return m(`div.${styles.buttons}${c}`, vnode.children);
    },
};

module.exports = Buttons;
