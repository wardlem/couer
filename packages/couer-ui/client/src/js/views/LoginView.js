const SessionState = require('../state/SessionState.js');
const m = require('mithril');

function findForm(target) {
    var el = target;
    while (el && el.tagName !== 'FORM') {
        console.log('el is', el);
        el = el.parentNode;
    }

    return el;
}

function submitForm(el, dest, method) {
    const form = new FormData(el);
    const data = {};
    for (let [k,v] of form) {
        data[k] = v;
    }

    console.log('submitting form', data);
    SessionState.login(dest, method, data);
}

const LoginView = function(def) {
    console.log('def:', def);
    const {submitUrl: loginUrl, submitMethod: loginMethod} = def;
    return {
        __proto__: LoginView.prototype,
        emailError: false,
        passwordError: false,
        emailValid: true,
        passwordValid: true,
        success: false,
        view: function(vnode) {
            const {emailError, passwordError, emailValid, passwordValid, success} = this;
            const {loginError, loggingIn} = SessionState;
            const hasError = Boolean(emailError || passwordError || loginError);

            return m('.ui.middle.aligned.center.aligned.grid', [
                m('.column', [
                    m('h2.ui.teal.image.header', [
                        // m('img.image', {props: {src: '/static/images/banner.jpg'}}),
                        m('.content', ['Log-in to your account']),
                    ]),
                    m(`form.ui.large.form${hasError ? '.error' : ''}`, {
                        onkeypress: (e) => {
                            if (e.code === 'Enter' && !loggingIn) {
                                console.log('e:', e);
                                var path = e.path;
                                var el = findForm(e.target);
                                if (el) {
                                    submitForm(el, loginUrl, loginMethod);
                                }
                            }
                        },
                        onsubmit: (e) => {
                            console.log('usbmitting');
                            e.preventDefault();
                        },
                    }, [
                        m('.ui.stacked.segment', [
                            m(`.field${emailValid ? '' : '.error'}`, {}, [
                                m('.ui.left.icon.input', [
                                    m('i.user.icon', []),
                                    m('input', {
                                        type: 'text',
                                        name: 'email',
                                        placeholder: 'E-mail address',
                                        oninput: (e) => {
                                            // input: (e) => dispatch(emailInput(e.target.value)),

                                        },
                                    }),
                                ]),
                            ]),
                            m(`.field${passwordValid ? '' : '.error'}`, {}, [
                                m('.ui.left.icon.input', [
                                    m('i.lock.icon', []),
                                    m('input', {
                                        type: 'password',
                                        name: 'password',
                                        placeholder: 'Password',
                                        oninput: (e) => {
                                            // dispatch(passwordInput(e.target.value))
                                        },
                                    }),
                                ]),
                            ]),
                            m(`.ui.fluid.large.teal.submit.button${loggingIn ? '.disabled' : ''}`, {
                                onclick: (e) => {
                                    if (!loggingIn) {
                                        console.log('e:', e);
                                        var path = e.path;
                                        var el = findForm(e.target);
                                        if (el) {
                                            submitForm(el, loginUrl, loginMethod);
                                        }
                                    }
                                },
                            }, ['Login']),
                            m(`.ui.loader.text.centered${loggingIn ? '.active' : ''}`, {
                            }, ['Logging You In']),
                        ]),
                    ]),

                    m('.ui.error.message', {
                        'class': {
                            error: hasError,
                            success: success,
                        },
                        style: {
                            display: (hasError || success) ? 'block' : 'none',
                        },
                    }, [
                        loginError || emailError || passwordError || 'Log-in Successful',
                    ]),
                ]),
            ]);
        },
    };
};

module.exports = LoginView;
