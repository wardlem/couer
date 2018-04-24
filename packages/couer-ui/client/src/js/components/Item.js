const m = require('mithril');

const styles = {}; // require('../../css/components/item.css');

const Item = {
    view: ({attrs, children}) => {
        return m(`.${styles.item}`, attrs, children);
    },
};

module.exports = Item;
