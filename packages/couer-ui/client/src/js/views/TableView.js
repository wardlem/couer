const m = require('mithril');
const debug = require('debug')('couer:TableView');

const Buttons = require('../components/Buttons');
const Button = require('../components/Button');
const SearchBox = require('../components/SearchBox');
const Action = require('../components/Action');
const Link = require('../components/Link');

const styles = Object.assign(
    {},
    require('../../css/components/box.css'),
    require('../../css/components/controls.css')
    // require('../../css/util.css')
    // require('../../css/views/table.css'),
);

const TableState = require('../state/TableState.js');
const LoadingView = require('./LoadingView.js');

const Table = {
    view: function(vnode) {
        const {theme = Couer.theme} = vnode.attrs;
        return m('div', {
            style: {
                // maxWidth: '1200px',
                marginRight: 'auto',
                marginLeft: 'auto',
                paddingLeft: '1.8rem',
                paddingRight: '1.8rem',
            },
        }, [
            m(TableMenu, vnode.attrs),
            m('', [
                m(`table.${theme.table}.${styles['box-raised']}.${theme['table-hover']}.${theme['bg-light']}.${theme['rounded']}`, [
                    m(TableHead, vnode.attrs),
                    m(TableBody, vnode.attrs),
                ]),
            ]),
        ]);
    },
};

const TableMenu = {
    view: function(vnode) {
        const {theme = Couer.theme} = vnode.attrs;
        const {meta, search} = TableState;
        const {total, page} = meta;
        const start = total === 0 ? 0 : Math.max(0, ((page.number - 1) * page.size + 1));
        const end = Math.min(total, page.number * page.size);

        return m(`.${styles.controls}.${theme.clearfix}.${styles.box}`, [
            m('', [
                `Showing ${start} \u2013 ${end} of ${total}`,
            ]),
            m(Action, {classes: `.${theme['float-right']}`}, [
                m(SearchBox, {
                    placeholder: 'Search...',
                    value: search,
                    onsubmit: (value) => {
                        // TODO
                        debug('search submitted:', value);
                    },
                    oninput: (value) => {
                        console.log('oninput', value);
                        TableState.search = value;
                    },
                }),
                // m('input', {
                //     type: 'text',
                //     placeholder: 'Search...',
                //     value: search,
                //     onkeypress: (e) => {
                //         if (e.code === 'Enter') {
                //             // TODO: submit search
                //         }
                //     },
                // }),
                // m(`button.${theme.icon}.${styles['button-secondary']}`, {
                //     onclick: (e) => {
                //         // TODO: submit search
                //     },
                // }, m(`i.${styles.search}.${styles.icon}`)),
            ]),
        ]);
    },
};

const TableHead = {
    view: function(vnode) {
        const {columns = [], sortKey = ''} = vnode.attrs;
        return m('thead', m('tr', columns.map((column) => {
            const {sortable = false, label = ''} = column;
            const child = sortable ? m(Link, {
                onclick: (e) => {
                    e.preventDefault();
                    debug('set sort to ', column.key);
                },
            }, [label]) : m('span', [label]);

            return m('th', [
                child,
            ]);
        })));
    },
};

const TableBody = {
    view: function(vnode) {
        return m('tbody', TableState.records.map((record) => {
            return m(TableRow, Object.assign({}, vnode.attrs, {record}));
        }));
    },
};

const TableRow = {
    view: function(vnode) {
        const {record, columns = [], itemlink = null} = vnode.attrs;
        return m('tr', {
            id: `row-${record._id}`,
            key: `row-${record._id}`,
            onclick: function(e) {
                if (itemlink) {
                    const link = itemlink.replace(/:([0-9a-zA-Z_]+)/g, function(match, p1) {
                        return record[p1];
                    });
                    m.route.set(link);
                }
            },
            style: {
                cursor: itemlink ? 'pointer' : 'default',
            },
        }, columns.map((column) => {
            let value = '';

            if (typeof column.display === 'string') {
                value = record[column.display];
            } else if (typeof column.display === 'function') {
                value = column.display(m, record);
            }

            return m('td', [String(value)]);
        }));
    },
};

const TablePagination = {
    view: function(vnode) {
        const {theme = Couer.theme} = vnode.attrs;
        const {meta} = TableState;
        const {page} = meta;
        const {count,  number,  size} = page;
        let min = Math.max(1, number - 1);
        let max = Math.min(count, number + 1);

        // if (min === 1)
        // {
        //     max = Math.min(count, number - (number - 4));
        // }
        // else if (max === count)
        // {
        //     min = Math.max(1, number - (nu))
        // }

        const numbered = [];
        for (let i = min; i <= max; i += 1) {
            let activeClass = i === number ? `.${theme.active}` : '';
            numbered.push(m(`li.${theme['page-item']}${activeClass}`, [m('a', [i])]));
        }

        const buttons = [
            m(`li.${theme['page-item']}${number === 1 || count === 0 ? `.${theme.disabled}` : ''}`, [m('a', ['Prev'])]),
            m(`li.${theme['page-item']}${min === 1 || count === 0 ? `.${theme['d-none']}` : ''}`, [m('a', ['1'])]),
            m(`li.${theme['page-item']}${min === 1 || count === 0 ? `.${theme['d-none']}` : ''}`, [m('span', ['...'])]),


            // m(`li.${theme['page-item']}${number === 1 ? `.${theme.disabled}` : ''}`, [m('a', ['Prev'])]),
            // m(Button, {icon: 'left arrow', title: 'previous', disabled: number === 1}),
            // m(Button, {active: number === 1}, 'First'),
        ].concat(numbered).concat([
            // m(Button, {active: page.number === count || count === 0}, ['Last']),
            // m(Button, {icon: 'right arrow', title: 'next', disabled: page.number === count || count === 0}),
            m(`li.${theme['page-item']}${max === count || count === 0 ? `.${theme['d-none']}` : ''}`, [m('span', ['...'])]),
            m(`li.${theme['page-item']}${max === count || count === 0 ? `.${theme['d-none']}` : ''}`, [m('a', [String(count)])]),
            m(`li.${theme['page-item']}${number === count || count === 0 ? `.${theme.disabled}` : ''}`, [m('a', ['Next'])]),
        ]);

        // return m(`.${styles['align-center']}.${styles.container}`, {
        return m(`.${theme['text-center']}`, [
            m(`ul.${theme.pagination}.${theme['flex-centered']}`, {
                style: {
                    marginTop: '20px',
                },
            }, buttons),
        ]);
    },
};

function TableView(def, theme) {
    const {datasource} = def;
    return {
        __proto__: TableView.prototype,
        title: def.title || 'Table',
        path: def.path,
        oninit: function() {
            TableState.loadRecords(datasource);
        },
        view: function() {
            const {loading, error} = TableState;
            let child;
            if (loading) {
                child = m(LoadingView, {theme});
            } else if (error) {
                child = m('p', TableState.error);
            } else {
                child = m('div.full-width', [
                    // TODO: move header to component
                    m(Table, Object.assign({theme}, def)),
                    m(TablePagination, {theme}),
                ]);
            }
            return child;
        },
    };
}

module.exports = TableView;
