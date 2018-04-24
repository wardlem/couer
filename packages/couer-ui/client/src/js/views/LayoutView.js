const m = require('mithril');
const debug = require('debug')('couer:SidebarMenu');
const Header = require('../components/Header');

const styles = Object.assign(
    {},
    require('../../css/views/layout.css')
    // require('../../css/components/menu.css')
);
const SidebarMenu = {
    view(vnode) {
        const {menulinks, contextmenus, activeMenu, theme, title} = vnode.attrs;
        const contextlinks = contextmenus[activeMenu] || null;
        const sections = contextlinks ? [contextlinks].concat(menulinks) : menulinks;
        return m(`nav.${styles.sidebar}`, {

        }, [
            m(HeaderSection, {title, theme}),
            m(`ul.${theme.menu}.${styles.menu}.${theme['menu-nav']}`, sections.map(([display, subItems]) =>
                m(MenuSection, {display, activeMenu, subItems, theme})
            )),
        ]);
    },
};

const MenuSection = {
    view(vnode) {
        const {display, activeMenu, subItems = [], theme} = vnode.attrs;
        return [
            m(`li.${theme['menu-item']}`, [
                m(`label.${styles.header}`, [display]),
                m(`ul.${theme.nav}.${theme['pl-1']}`, subItems.map((item) => {
                    return m(NavItem, {item, activeMenu, theme});
                })),
            ]),
        ];
    },
};


const NavItem = {
    view(vnode) {
        const {item, activeMenu, theme} = vnode.attrs;
        const [display, url, icon = ''] = item;
        const activeClass = display === activeMenu ? `.${styles.active}` : '';
        return m(`li.${theme['nav-item']}${activeClass}.${styles['menu-item']}`, {
            onclick: (e) => {
                e.preventDefault();
                m.route.set(url);
            },
        }, [
            m(`a[href=${url}]`, {

            }, [
                m(`i.${theme.icon}${theme[icon] ? `.${theme[icon]}` : ''}`),
                display,
            ]),
        ]);
    },
};

const HeaderSection = {
    view(vnode) {
        let {title, theme} = vnode.attrs;
        if (typeof title === 'function') {
            title = title(m);
        }
        return m(`h1.${styles['site-title']}`, [
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
            theme = Couer.theme,
            view,
        } = vnode.attrs;

        debug('children', vnode.children);
        let viewData = {};
        if (typeof view.data === 'function') {
            viewData = view.data();
        }

        let crumbs = view.title;
        if (typeof crumbs === 'function') {
            crumbs = crumbs(m, viewData, theme);
        }
        if (typeof crumbs === 'string') {
            crumbs = [crumbs];
        }
        if (Array.isArray(crumbs)) {
            crumbs = m(`ul.${theme.breadcrumb}`, crumbs.map((crumb) => {
                return m(`li.${theme['breadcrumb-item']}`, [crumb]);
            }));
        }

        return [
            m(`.${styles.layout}`, [
                m(SidebarMenu, {menulinks, contextmenus, activeMenu, title, theme}),
                m(`.${styles.main}`, [
                    m(`header.${styles.navbar}.${theme['text-large']}.${theme['px-4']}`, [
                        m(`.${theme['navbar-section']}`, [
                            crumbs,
                        ]),
                    ]),
                    m(view),
                ]),
            ]),
        ];

    },
};


module.exports = LayoutView;
