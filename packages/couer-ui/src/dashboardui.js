const merge = require('merge-descriptors');

function NotFoundUI(options) {
    return {
        __proto__: NotFoundUI.prototype,
    };
}

merge(NotFoundUI.prototype, {
    definition(config) {
        return [
            {type: 'dashboard', path: '/'},
        ];
    },
});

module.exports = NotFoundUI;
