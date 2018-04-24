const m = require('mithril');

const Header = {
    view: ({attrs, children}) => {
        // TODO: more functionality
        const {level = 2} = attrs;
        return m(`h${level}`, children);
    },
};

module.exports = Header;
