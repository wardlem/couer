const m = require('mithril');
const BaseInput = require('./BaseInput.js');

const SubForm = function SubForm(def) {
    const createInput = require('./createInput.js');
    const subinputs = (def.subform || []).map(createInput);
    return BaseInput({
        key: def.key,
        'default': () => {
            return subinputs.reduce((res, subinput) => {
                res[subinput.key] = subinput.default();
                return res;
            }, {});
        },
        view: (vnode) => {
            const {
                value = {},
                name = def.key,
                oninput,
            } = vnode.attrs;

            function hidden(input) {
                if (typeof input.hideif === 'function') {
                    return input.hideif(value, require('../../state/FormState.js').data);
                }
                return false;
            }

            const suboninput = (subkey, newsubvalue) => {
                const newvalue = Object.assign({}, value, {[subkey]: newsubvalue});
                oninput(def.key, newvalue);
            };
            // console.log('VALUE IS:', value);
            return m('fieldset.formSection', [
                // m('legend.header', [def.label]),
                m('', subinputs.map((subinput) => {
                    const subvalue = value[subinput.key];
                    console.log(`${subinput.key} hidden? ${hidden(subinput)} ${subinput.hideif}`);
                    return m(subinput, Object.assign({}, vnode.attrs, {
                        value: subvalue,
                        name: `${name}[${subinput.key}]`,
                        oninput: suboninput,
                        hide: hidden(subinput),
                    }));
                })),
            ]);
        },
    }, def);
};

module.exports = SubForm;
