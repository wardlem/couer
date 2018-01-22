const Property = require('../Property');

module.exports = Property.extend({
    loaders: [
        (value, prop) => {
            if (value === 'true' || value === 'TRUE' || value === 'True') {
                return true;
            } else if (value === 'false' || value === 'FALSE' || value === 'False') {
                return false;
            } else if (value === 0) {
                return false;
            } else if (value === 1) {
                return true;
            }

            return value;
        },
    ],
    meta: {
        'default': false,
        formtype: 'boolean',
    },
    validators: [
        (value, prop) => {
            if (typeof value === 'boolean') {
                return false;
            }

            return value == null ? false : 'must be true or false';
        },
    ],
});
