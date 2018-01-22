const merge = require('merge-descriptors');

function ListUI(options) {
    const {
        path,
        datasource,
        type = 'table',
        menuTitle = '',
        contextTitle = '',
        contextIcon = '.list',
        contextKey = '',
        activeMenu = menuTitle,
        title = 'List',
        columns = [],
        itemlink = null,
    } = options;

    return {
        path,
        datasource,
        type,
        menuTitle,
        contextTitle,
        contextIcon,
        contextKey,
        activeMenu,
        title,
        columns,
        itemlink,
        __proto__: ListUI.prototype,
    };
}

merge(ListUI.prototype, {
    definition({basepath}) {
        return {
            type: this.type,
            datasource: this.datasource,
            path: `${basepath}/${this.path}`,
            menuTitle: this.menuTitle,
            contextTitle: this.contextTitle,
            contextIcon: this.contextIcon,
            contextKey: this.contextKey,
            activeMenu: this.activeMenu,
            title: this.title,
            columns: this.columns,
            itemlink: this.itemlink,
        };
    },
});

module.exports = ListUI;
