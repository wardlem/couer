const m = require('mithril');

function request(method, url, data, headers = {}) {
    const SessionState = require('../state/SessionState.js');
    headers = Object.assign({'Api-Token': SessionState.token}, headers);

    console.log(`${method} ${url} ${data} ${headers}`);
    let ref;
    let req = m.request({
        method,
        url,
        withCredentials: false,
        headers,
        config: function(req) { ref = req; },
        data,
    }).then(function(result) {
        // what here
        return result;
    }).catch(function(message) {
        const error = message.error;
        const data = new Error(error.message);
        data.status = error.status;
        data.details = error.details;
        if (parseInt(message.code) === 401) {
            // not logged in
            SessionState.loggedOut();
        }

        return Promise.reject(data);
    });

    req.cancel = () => {
        if (ref) {
            ref.cancel();
        }
    };

    return req;
}

module.exports = request;
