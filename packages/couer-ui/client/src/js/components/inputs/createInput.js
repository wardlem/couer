module.exports = function createInput(def) {
    const TextInput = require('./TextInput.js');
    const HiddenInput = require('./HiddenInput.js');
    const DateTimeInput = require('./DateTimeInput.js');
    const Repeater = require('./Repeater.js');
    const SubForm = require('./SubForm.js');
    const SelectInput = require('./SelectInput.js');

    switch (def.type) {
        case 'datetime':
            return DateTimeInput(def);
        case 'hidden':
            return HiddenInput(def);
        case 'repeater':
            return Repeater(def);
        case 'subform':
            return SubForm(def);
        case 'select':
            return SelectInput(def);
        case 'text':
        default:
            return TextInput(def);
    }
};
