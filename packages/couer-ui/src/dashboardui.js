const merge = require('merge-descriptors');

function DashboardUI(options) {
    return {
        __proto__: DashboardUI.prototype,
    };
}

merge(DashboardUI.prototype, {
    definition(config) {
        return [
            {type: 'dashboard', path: '/'},
        ];
    },
});

module.exports = DashboardUI;
