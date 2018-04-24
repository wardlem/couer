const m = require('mithril');

const FormState = require('../state/FormState.js');

const styles = {}; // require('../../css/components/form.css');

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

const oninput = FormState.setValueFor.bind(FormState);
function hidden(input) {
    if (typeof input.hideif === 'function') {
        return input.hideif(FormState.data, FormState.data);
    }
    return false;
}
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
            theme = Couer.theme,
        } = vnode.attrs;

        let inputs = fields.map((input) => {
            return m(input, {value: FormState.valueFor(input.key), hide: hidden(input), oninput});
        });
        let stateclass = '';
        if (FormState.success) {
            stateclass = styles.success;
        } else if (FormState.haserrors) {
            stateclass = styles.error;
        }

        return m(`form.${styles.large}.${styles.form}.${stateclass}`, {
            style: {
                paddingBottom: '4rem',
            },
        }, inputs.concat([
            // m('.ui.success.message', [
            //     m('.header', ['Success!']),
            //     m('p', 'Please wait while we redirect you'),
            // ]),
            // m('.ui.error.message', [
            //     m('.header', ['We found a few problems...']),
            //     m(ErrorMessages, {errors: FormState.errors, fieldLabels}),
            // ]),
            m(`.${theme.btn}.${theme['btn-primary']}.${theme['float-right']}${FormState.submitting ? `.${theme.loading}` : ''}`, {
                onclick: (e) => {
                    FormState.submit(submitUrl, submitMethod, redirect);
                },
            }, [
                submitText,
            ]),
        ]));
    },
};

module.exports = Form;
