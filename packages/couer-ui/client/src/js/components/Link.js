const m = require('mithril');
const styles = {}; // require('../../css/components/link.css');

const noop = () => {};
const Link = {
    view: ({attrs, children}) => {
        const {
            tag = 'a',
            onclick = noop,
        } = attrs;

        return m(`${tag}.${styles.link}`, {
            onclick,
        }, children);
    },
};

module.exports = Link;
