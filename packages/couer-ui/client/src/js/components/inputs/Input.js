const m = require('mithril');

const styles = Object.assign(
    {}
    // require('../../../css/components/form.css')
);


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
            theme = Couer.theme,
        } = vnode.attrs;

        // TODO: widths...
        return m(`.${width}-wide.${theme['form-group']}${error ? `.${theme['has-error']}` : ''}${hide ? `.${theme['d-none']}` : ''}`, {
            'class': {
                [theme['d-none']]: hide,
            },
        }, [
            m(`label.${theme['form-label']}`, [label]),
            m(`input.${theme['form-input']}.${theme['input-sm']}`, {
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
