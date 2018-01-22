const m = require('mithril');
const SessionState = require('./SessionState.js');
const TableState = {
    records: [],
    loading: false,
    currentRequest: null,
    error: '',
    meta: {},
    search: m.route.param('search') || '',
    reset: function() {
        this.meta = {};
        this.search = m.route.param('search') || '';
    },
    loadRecords: function(source, recordPath = ['data']) {
        const headers = {'Api-Token': SessionState.token};
        if (TableState.currentRequest != null) {
            TableState.currentRequest.abort();
            TableState.currentRequest = null;
        }
        TableState.loading = true;

        m.request({
            method: 'GET',
            url: source,
            withCredentials: false,
            headers,
            config: function(req) { TableState.currentRequest = req; },
        }).then(function(result) {
            let records = result;
            for (let i = 0; i < recordPath.length; i += 1) {
                records = records[recordPath[i]];
            }

            TableState.records = records;
            TableState.meta = result.meta;
            TableState.links = result.links;
            TableState.loading = false;
        }).catch(function(error) {
            TableState.error = error && error.error && error.error.message;
            TableState.loading = false;
            if (error.error && error.error.status) {
                if (error.error.status === 401) {
                    SessionState.loggedOut();
                }
            }
        });
    },
};

module.exports = TableState;
