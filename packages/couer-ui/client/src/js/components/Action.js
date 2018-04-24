const m = require('mithril');
const styles = Object.assign(
    {}
    // require('../../css/components/form.css')
);

const Action = {
    view: ({children, attrs}) => {
        const {classes = ''} = attrs;
        return m(`div.${styles.action}${classes}`, children);
    },
};

module.exports = Action;
