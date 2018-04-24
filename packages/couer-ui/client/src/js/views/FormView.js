const m = require('mithril');
const debug = require('debug')('couer:FormView');

const LoadingView = require('./LoadingView.js');
const FormState = require('../state/FormState.js');

const Form = require('../components/Form');

const createInput = require('../components/inputs/createInput.js');

const styles = Object.assign({},
    require('../../css/components/box.css')
);

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

function FormView(def) {
    const fields = buildFields(def.fields);
    const fieldLabels = buildFieldLabels(def.fields);
    const {submitUrl, submitMethod, loadUrl = null, loadMethod = 'GET', redirect = '/'} = def;
    const formAttrs = {fields, fieldLabels, submitUrl, submitMethod, redirect};
    return {
        title: def.title,
        path: def.path,
        oninit: (vnode) => {
            debug('FORM VIEW INIT');
            FormState.reset(buildDefaults(def.fields));
            if (loadUrl && loadMethod) {
                FormState.load(loadUrl, loadMethod);
            }
        },
        data: () => FormState.data,
        view: (vnode) => {
            const {theme = Couer.theme} = vnode.attrs;

            if (FormState.loading) {
                return m(LoadingView);
            }

            return m(`.${styles['form-box']}.${styles['box']}.${theme['bg-light']}.${styles['box-raised']}`, {
                style: {
                    maxWidth: '1200px',
                    marginRight: 'auto',
                    marginLeft: 'auto',
                    paddingLeft: '1.8rem',
                    paddingRight: '1.8rem',
                },
            }, [
                m(Form, formAttrs),
            ]);

        },
    };
}

module.exports = FormView;
