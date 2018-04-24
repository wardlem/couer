const m = require('mithril');

const styles = {}; // require('../../css/components/item.css');

const Items = {
    view: ({attrs, children}) => {
        const {
            striped = false,
        } = attrs;

        // TODO: stripe em

        return m(`.${styles.items}`, children);
    },
};

module.exports = Items;
