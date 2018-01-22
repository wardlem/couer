const Input = require('./Input.js');
const BaseInput = require('./BaseInput.js');
// const _commonValidations = require('./_commonValidations');
const m = require('mithril');

module.exports = (def) => {
    const {key} = def;

    return BaseInput({
        key,
        'default': typeof def.default === 'function ' ? def.default : () => def.default,
        view: (vnode) => {
            return m(Input, Object.assign({}, def, vnode.attrs, {type: 'text'}));
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
};
