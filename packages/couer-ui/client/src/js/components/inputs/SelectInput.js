const BaseInput = require('./BaseInput.js');

// const _commonValidations = require('./_commonValidations');
const m = require('mithril');

function SelectInput(def) {
    const {
        key,
        options,
        label,
        required,
        hide,
        width,
        placeholder,
        theme = Couer.theme,
    } = def;

    return BaseInput({
        key,
        'default': typeof def.default === 'function ' ? def.default : () => def.default,
        view: (vnode) => {
            const {error, value, oninput, name = key} = vnode.attrs;
            return m(`.${theme['form-group']}.${width}.wide.field${error ? '.error' : ''}`, {
                style: {
                    display: hide ? 'none' : undefined,
                },
            }, [
                m(`label.${theme['form-label']}`, [label]),
                m(`select.${theme['form-select']}.${theme['select-sm']}`, {
                    name,
                    placeholder,
                    required: Boolean(required),
                    value,
                    onchange: oninput ? (e) => oninput(key, e.target.value) : undefined,
                }, options.map((opt) => {
                    return m('option', {
                        value: opt,
                    }, [opt]);
                })),
            ]);
        },
    }, def);

    // const validate = (value, data) => {
    //     const {
    //         required = false,
    //         errorMessages = {},
    //     } = props;
    //     return _commonValidations(props, value, data) || (()=> {
    //         return '';
    //     })();
    // };
}

module.exports = SelectInput;
