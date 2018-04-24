const m = require('mithril');
const styles = Object.assign(
    {}
    // require('../../css/util.css'),
    // require('../../css/components/button.css'),
    // require('../../css/components/form.css')
);

const SearchBox = {
    view: (vnode) => {
        const {
            placeholder = 'Search...',
            value = '',
            onsubmit = null,
            oninput = null,
            submitOnEnter = true,
            theme = Couer.theme,
            icon = 'search',
        } = vnode.attrs;

        return m(`.${theme['input-group']}`, [
            m(`input.${theme['form-input']}.${theme['input-sm']}`, {
                type: 'text',
                placeholder,
                value,
                onkeypress: (e) => {
                    if (submitOnEnter && e.code === 'Enter') {
                        // TODO: submit
                        if (typeof onsubmit === 'function') {
                            onsubmit(e.target.value);
                        }
                    }
                },
                oninput: (e) => {
                    if (typeof oninput === 'function') {
                        oninput(e.target.value);
                    }
                },
            }),
            m(`button.${theme.btn}.${theme['btn-primary']}.${theme['input-group-btn']}.${theme['btn-sm']}`, {
                onclick: (e) => {
                    if (typeof onsubmit === 'function') {
                        onsubmit(e.target.previousSibling.value);
                    }
                },
            }, ['Search']/* , m(`i.${theme[icon]}.${theme.icon}`)*/),
        ]);
    },
};

module.exports = SearchBox;
