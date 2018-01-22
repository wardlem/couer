const m = require('mithril');

const LoadingView = require('./LoadingView.js');

const FormState = require('../state/FormState.js');

const createInput = require('./inputs/createInput.js');

const ErrorMessages = {
    // TODO
    view: (vnode) => {
        const {errors, fieldLabels} = vnode.attrs;
        return m('ul.list', Object.keys(errors).reduce((result, name) => {
            let error = errors[name];
            if (error) {
                result.push(m('li', [`${fieldLabels[name]}: ${error}`]));
            }

            return result;
        }, []));
    },
};


function buildFields(fielddefs) {
    return (fielddefs || []).map(createInput);
}

function buildFieldLabels(fielddefs) {
    return (fielddefs || []).reduce((res, def) => {
        res[def.key] = def.label;

        return res;
    }, {});
}

function buildDefaults(fielddefs) {
    return (fielddefs || []).reduce((res, def) => {
        let defaultval = def.default;
        if (typeof def.default === 'function') {
            defaultval = defaultval();
        }

        res[def.key] = defaultval;

        if (m.route.param(def.key)) {
            res[def.key] = m.route.param(def.key);
        }

        return res;
    }, {});
}

const oninput = FormState.setValueFor.bind(FormState);
const Form = {
    oninput: (key, value) => FormState.setValueFor(key, value),
    view: (vnode) => {
        const {
            fields,
            fieldLabels,
            submitText = 'Submit',
            submitMethod = 'POST',
            submitUrl = '',
            redirect,
        } = vnode.attrs;

        function hidden(input) {
            if (typeof input.hideif === 'function') {
                return input.hideif(FormState.data, FormState.data);
            }
            return false;
        }

        let inputs = fields.map((input) => {
            return m(input, {value: FormState.valueFor(input.key), hide: hidden(input), oninput});
        });
        let stateclass = '';
        if (FormState.success) {
            stateclass = '.success';
        } else if (FormState.haserrors) {
            stateclass = '.error';
        }

        return m(`form.ui.large.form${stateclass}`, {
            style: {
                paddingBottom: '4rem',
            },
        }, inputs.concat([
            m('.ui.success.message', [
                m('.header', ['Success!']),
                m('p', 'Please wait while we redirect you'),
            ]),
            m('.ui.error.message', [
                m('.header', ['We found a few problems...']),
                m(ErrorMessages, {errors: FormState.errors, fieldLabels}),
            ]),
            m(`.ui.blue.right.floated.button${FormState.submitting ? '.loading' : ''}`, {
                onclick: (e) => {
                    FormState.submit(submitUrl, submitMethod, redirect);
                },
            }, [
                submitText,
            ]),
        ]));
    },
};

function FormView(def) {
    const fields = buildFields(def.fields);
    const fieldLabels = buildFieldLabels(def.fields);
    const {submitUrl, submitMethod, loadUrl = null, loadMethod = 'GET', redirect = '/'} = def;
    const formAttrs = {fields, fieldLabels, submitUrl, submitMethod, redirect};
    return {
        path: def.path,
        oninit: (vnode) => {
            console.log('FORM VIEW INIT');
            FormState.reset(buildDefaults(def.fields));
            if (loadUrl && loadMethod) {
                FormState.load(loadUrl, loadMethod);
            }
        },
        view: () => {
            if (FormState.loading) {
                return m(LoadingView);
            }

            return m('div', [
                m('h2.ui.dividing.header', [typeof def.title === 'function' ? def.title(m, FormState.data) : def.title]),
                m(Form, formAttrs),
            ]);

        },
    };
}

module.exports = FormView;
