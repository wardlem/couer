const m = require('mithril');

const TableState = require('../state/TableState.js');
console.log('TABLESTATE', TableState);
const LoadingView = require('./LoadingView.js');

const Table = {
    view: function(vnode) {
        return m('', [
            m(TableMenu),
            m('', [
                m('table.full-width.striped.selectable.table', [
                    m(TableHead, vnode.attrs),
                    m(TableBody, vnode.attrs),
                ]),
            ]),
        ]);
    },
};

const TableMenu = {
    view: function(vnode) {
        const {meta, search} = TableState;
        const {total, page} = meta;
        const start = total === 0 ? 0 : Math.max(0, ((page.number - 1) * page.size + 1));
        const end = Math.min(total, page.number * page.size);

        return m('.controls.clearfix.box', [
            m('', [
                `Showing ${start} \u2013 ${end} of ${total}`,
            ]),
            m('.action.float-right', [
                m('input', {
                    type: 'text',
                    placeholder: 'Search...',
                    value: search,
                    onkeypress: (e) => {
                        if (e.code === 'Enter') {
                            // TODO: submit search
                        }
                    },
                }),
                m('button.icon.secondary', {
                    onclick: (e) => {
                        // TODO: submit search
                    },
                }, m('i.search.icon')),
            ]),
        ]);
    },
};

const TableHead = {
    view: function(vnode) {
        const {columns = [], sortKey = ''} = vnode.attrs;
        return m('thead', m('tr', columns.map((column) => {
            const {sortable = false, label = ''} = column;
            const tag = sortable ? 'a.link[href=#]' : 'span';

            return m('th', [
                m(tag, {
                    style: {
                        cursor: sortable ? 'cursor' : 'default',
                    },
                    onclick: sortable ? (e) => {
                        e.preventDefault();
                        console.log('set sort to ', column.key);
                        // setSort(state, dispatch, sortKeys[label]);
                    } : undefined,
                }, [label]),
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
        const {meta} = TableState;
        const {page} = meta;
        const {count, number, size} = page;

        const min = Math.max(1, number - 4);
        const max = Math.min(count, number + 4);

        console.log('MIN:', min, 'MAX:', max);

        const numbered = [];
        for (let i = min; i <= max; i += 1) {
            numbered.push(m(`button.ui.button${i === page.number ? '.active' : ''}`, {
                // href: 'javascript:void(null)',
                onclick: () => {
                    // TODO
                    // goToPage(state, dispatch, i),
                },
            }, [i]));
        }

        const buttons = [
            m(`.ui.icon.button${number === 1 ? '.disabled' : ''}`, {
                on: {
                    // click: goToPage.bind(null, state, dispatch, page.number - 1),
                },
            }, [
                m('i.left.arrow.icon'),
            ]),
            m(`.ui.button${number === 1 ? '.active' : ''}`, {
                // 'class': {active: page.number === 1},
                // props: {href: '#'},
                on: {
                    // click: goToPage.bind(null, state, dispatch, 1),
                },
            }, ['First']),
        ].concat(numbered).concat([
            m(`.ui.button${page.number === count || count === 0 ? '.active' : ''}`, {
                'class': {active: page.number === count || count === 0},
                props: {href: '#'},
                on: {
                    // click: goToPage.bind(null, state, dispatch, count),
                },
            }, ['Last']),
            m(`.ui.right.icon.button${page.number === count || count === 0 ? '.disabled' : ''}`, {
                // 'class': {disabled: page.number === count || count === 0},
                on: {
                    // click: goToPage.bind(null, state, dispatch, page.number + 1),
                },
            }, [
                m('i.right.arrow.icon'),
            ]),
        ]);

        return m('.ui.container.center.aligned.padded', {
            style: {
                marginTop: '20px',
            },
        }, [
            m('.ui.buttons.centered', buttons),
        ]);
    },
};

function TableView(def) {
    const {datasource} = def;
    return {
        title: def.title || 'Table',
        path: def.path,
        oninit: function() {
            TableState.loadRecords(datasource);
        },
        view: function() {
            const {loading, error} = TableState;
            let child;
            if (loading) {
                child = m(LoadingView);
            } else if (error) {
                child = m('p', TableState.error);
            } else {
                child = m('div.full-width', [
                    m('h2.ui.dividing.header', [typeof def.title === 'function' ? def.title(m, TableState.records) : def.title]),
                    m(Table, def),
                    m(TablePagination),
                ]);
            }
            return child;
        },
    };
}

module.exports = TableView;
