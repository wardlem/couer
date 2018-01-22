const m = require('mithril');

module.exports = {
    view: (vnode) => {
        const {
            oninput,
            label,
            key,
            type = 'text',
            width = 'sixteen',
            error,
            placeholder = '',
            required = false,
            value = '',
            hide = false,
            name = key,
        } = vnode.attrs;

        return m(`.${width}.wide.field${error ? '.error' : ''}${hide ? '.hidden' : ''}`, {
            style: {
                display: hide ? 'none' : 'initial',
            },
        }, [
            m('.label', [label]),
            m('input', {
                name,
                type,
                placeholder,
                required: Boolean(required),
                value,
                oninput: oninput ? (e) => oninput(key, e.target.value) : undefined,
            }),
        ]);
    },
};
