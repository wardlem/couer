const m = require('mithril');

const replacePath = require('../util/replacepath.js');
const request = require('../util/request.js');

const FormState = {
    data: {},
    loading: false,
    submitting: false,
    currentRequest: null,
    errors: {},
    get haserrors() { return Boolean(this.errorMessage) || Object.keys(this.errors).length > 0; },
    reset(defaults) {
        // TODO: needs to be deep
        this.data = Object.assign({}, defaults || {});
        this.errors = {};
        this.errorMessage = '';
        this.success = '';
        this.submitting = false;
    },
    valueFor(key) {
        return this.data[key];
    },
    setValueFor(key, value) {
        this.data[key] = value;
    },
    submit(url, method, redirect = '/') {
        const useUrl = replacePath(url, FormState.data);
        console.log('original url: ', url, 'final url', useUrl);
        FormState.submitting = true;
        if (this.currentRequest) {
            this.currentRequest.cancel;
        }
        this.currentRequest = request(method, useUrl, this.data);
        this.currentRequest.then(function(result) {
            FormState.reset(result.data);
            FormState.success = result.message || 'Successfully Submitted';
            console.log('form result', result);
            if (redirect) {
                setTimeout(() => {
                    console.log('redirect url', redirect);
                    const useUrl = replacePath(redirect, FormState.data);
                    m.route.set(useUrl);
                }, 3000);
            }
        }).catch(function(error) {
            FormState.errorMessage = error.message;
            FormState.errors = error.details || {};
            FormState.submitting = false;
            console.error('form error', error.message);
        });
    },
    load(url, method) {
        const useUrl = replacePath(url, (key) => m.route.param(key));
        const req = request(method, useUrl);
        req.then(function(result) {
            FormState.loading = false;
            FormState.data = result.data;
            console.log('form load result', result);
        }).catch(function(error) {
            FormState.errorMessage = error.message;
            FormState.errors = error.details || {[error.status]: error.message};
            FormState.loading = false;
            console.error('form load error', error);
        });
    },
};

module.exports = FormState;
