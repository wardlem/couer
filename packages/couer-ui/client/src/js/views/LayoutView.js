const m = require('mithril');

const SidebarMenu = {
    view(vnode) {
        const {menulinks, contextmenus, activeMenu, title} = vnode.attrs;
        const contextlinks = contextmenus[activeMenu] || null;
        const sections = contextlinks ? [contextlinks].concat(menulinks) : menulinks;
        return m('.sidebar', {

        }, m('nav.menu', sections.map(([display, subItems]) =>
            m(MenuSection, {display, activeMenu, subItems})
        )));
    },
};

const MenuSection = {
    view(vnode) {
        const {display, activeMenu, subItems = []} = vnode.attrs;
        return [
            m('.header', [display]),
            subItems.map((item) => {
                return m(NavItem, {item, activeMenu});
            }),
        ];
    },
};


const NavItem = {
    view(vnode) {
        const {item, activeMenu} = vnode.attrs;
        const [display, url, icon = ''] = item;
        const activeClass = display === activeMenu ? '.active' : '';
        return m(`a.item${activeClass}[href=${url}]`, {
            onclick: (e) => {
                e.preventDefault();
                m.route.set(url);
            },
        }, [
            m(`i.icon${icon}`),
            display,
        ]);
    },
};

const HeaderSection = {
    view(vnode) {
        let {title} = vnode.attrs;
        if (typeof title === 'function') {
            title = title(m);
        }
        return m('h1.site-title', [
            m('a[href=/]', {
                oncreate: m.route.link,
            }, [title]),
        ]);
    },
};

const LayoutView = {
    view(vnode) {
        const {
            menulinks = [],
            contextmenus = {},
            activeMenu = '',
            title = 'Couer App',
        } = vnode.attrs;
        return [
            m('.navbar', [
                m(HeaderSection, {title}),
                m('.tools', [
                ]),
            ]),
            m('.layout', [
                m(SidebarMenu, {menulinks, contextmenus, activeMenu, title}),
                m('.main', vnode.children),
            ]),
        ];

    },
};


module.exports = LayoutView;
