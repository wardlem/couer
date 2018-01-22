const merge = require('merge-descriptors');

function NotFoundUI(options) {
    return {
        __proto__: NotFoundUI.prototype,
    };
}

merge(NotFoundUI.prototype, {
    definition(config) {
        return [
            {type: '404', path: '/:404...'},
        ];
    },
});

module.exports = NotFoundUI;
