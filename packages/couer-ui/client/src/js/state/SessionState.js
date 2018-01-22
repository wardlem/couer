const m = require('mithril');

const SessionState = {
    isloggedin: Boolean(localStorage.getItem('couer:token')),
    token: localStorage.getItem('couer:token'),
    loginError: '',
    loggingIn: false,
    loggedOut: function() {
        this.isloggedin = false;
        localStorage.setItem('couer:token', '');
    },
    loggedIn: function(token) {
        console.log('token is', token);
        this.isloggedin = Boolean(token);
        this.token = token;
        localStorage.setItem('couer:token', token);
    },
    login: function(loginUrl, loginMethod, data) {
        SessionState.loggingIn = true;
        console.log('logging in', loginUrl, loginMethod, data);
        m.request({
            method: loginMethod,
            url: loginUrl,
            withCredentials: false,
            headers: {},
            data,
        }).then(function(result) {
            let token = result && result.data && result.data.token && result.data.token.value;
            SessionState.loggingIn = false;
            SessionState.loggedIn(token);
            console.log('login result', result);
        }).catch(function(error) {
            SessionState.loginError = error.message;
            SessionState.loggingIn = false;
            console.error('login error', error.status, error.message);
        });
    },
};

console.log('session state', SessionState);

module.exports = SessionState;
