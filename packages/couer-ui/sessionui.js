const merge = require('merge-descriptors');

function SessionUI(options) {
    const {
        path = '/login',
        usernameKey = 'email',
        passwordKey = 'password',
        submitMethod = 'POST',
        submitUrl = '',
        type = 'login',
    } = options;

    return {
        path,
        type,
        usernameKey,
        passwordKey,
        submitMethod,
        submitUrl,
        __proto__: SessionUI.prototype,
    };
}

merge(SessionUI.prototype, {
    definition({basepath}) {
        return {
            type: this.type,
            usernameKey: this.usernameKey,
            passwordKey: this.passwordKey,
            path: `${basepath}/${this.path}`,
            submitMethod: this.submitMethod,
            submitUrl: this.submitUrl,
            islogin: true,
            loginRequired: false,
        };
    },
});

module.exports = SessionUI;
