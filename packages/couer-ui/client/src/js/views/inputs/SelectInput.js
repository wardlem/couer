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
    } = def;

    return BaseInput({
        key,
        'default': typeof def.default === 'function ' ? def.default : () => def.default,
        view: (vnode) => {
            const {error, value, oninput, name = key} = vnode.attrs;
            return m(`.${width}.wide.field${error ? '.error' : ''}`, {
                style: {
                    display: hide ? 'none' : undefined,
                },
            }, [
                m('.label', [label]),
                m('select', {
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
