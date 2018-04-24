const m = require('mithril');

const styles = Object.assign(
    {}
    // require('../../css/util.css'),
    // require('../../css/components/button.css')
);

const Button = {
    view: function(vnode) {
        let {
            icon = null,
            active = false,
            onclick = null,
            disabled = false,
            theme = Couer.theme,
        } = vnode.attrs;

        const d = disabled ? `.${styles.disabled}` : '';
        const a = active ? `.${styles.active}` : '';
        if (icon && !Array.isArray(icon)) {
            icon = icon.split(' ');
        }

        const i = icon ? `.${styles.icon}` : '';
        const iconClasses = (icon && icon.length) ? icon.map((i) => `.${theme[i]}`).join('') : '';
        const children = (icon ? [m(`i.${theme.icon}${iconClasses}`)] : []).concat(vnode.children);

        return m(`div.${styles.button}${i}${d}${a}`, {
            onclick,
        }, children);
    },
};

module.exports = Button;
