const m = require('mithril');
const BaseInput = require('./BaseInput.js');

const styles = Object.assign({},
    require('../../../css/components/box.css')
);

const Segment = require('../Segment');
const Header = require('../Header');
const Items = require('../Items');
const Item = require('../Item');

const Repeater = function Repeater(def) {
    const createInput = require('./createInput.js');
    const subinput = createInput(def.subdef);
    const {
        maxlen = Infinity,
    } = def;

    const repeater = {
        key: def.key,
        hovered: -1,
        'default': () => [],
        view: (vnode) => {
            const {
                value,
                name = def.key,
                oninput,
                theme = Couer.theme,
            } = vnode.attrs;

            return m(`.${styles.box}.${styles['form-box']}.${theme['bg-light']}`, [
                m(`label.${theme['form-label']}.${theme['text-secondary']}.${theme['text-bold']}`, [def.label]),
                m(`.${theme.divider}`),
                m(`.${theme['']}`, (value || []).map((subvalue, index) => {
                    const suboninput = (subkey, newsubvalue) => {
                        console.log('subform suboniput', subkey, index, newsubvalue);
                        const newvalue = value.slice(0, index).concat([newsubvalue]).concat(value.slice(index + 1));
                        oninput(def.key, newvalue);
                    };
                    return [m(Item, [
                        m(`.${theme.clearfix}`, {
                            style: {
                                marginRight: '0.75rem',
                            },
                        }, [
                            m(`button.${theme.btn}.${theme['btn-action']}.${theme.circle}.${theme['btn-sm']}${repeater.hovered === index ? `.${theme['btn-error']}` : ''}.${theme['float-right']}`, {
                                onmouseenter: (e) => {
                                    console.log('repeater is', repeater);
                                    repeater.hovered = index;
                                },
                                onmouseleave: (e) => {
                                    if (repeater.hovered === index) {
                                        repeater.hovered = -1;
                                    }
                                },
                                onclick: (e) => {
                                    e.preventDefault();
                                    if (def.confirmRemove) {
                                        // TODO: show confirm modal
                                    }
                                    console.log('remove', index);
                                    const newvalue = value.slice(0, index).concat(value.slice(index + 1));
                                    oninput(def.key, newvalue);
                                },
                                style: {
                                    cursor: 'pointer',
                                },
                            }, (repeater.hovered === index) ? m(`i.${theme.icon}.${theme['icon-cross']}`, {
                                style: {
                                    margin: 0,
                                },
                            }) : [m('i', [String(index + 1)])]),
                        ]),
                        m('.ui.content', [
                            m(subinput, Object.assign({}, vnode.attrs, {value: subvalue, name: `${name}[${index}]`, oninput: suboninput})),
                        ]),
                    ]), m(`.${theme.divider}`)];
                })),
                m(`.${theme['']}`, [].concat([
                    value.length < maxlen ? m(`.${theme.clearfix}`, [
                        m('', {
                            style: {
                                marginRight: '0.75rem',
                            },
                        }, [
                            m(`button.${theme.btn}.${theme['btn-action']}.${theme.circle}.${theme['btn-sm']}.${theme['btn-success']}.${theme['float-right']}`, {

                                onclick: (e) => {
                                    e.preventDefault();

                                    console.log('add', value.length);
                                    const newitem = subinput.default();
                                    const newvalue = value.concat([newitem]);

                                    oninput(def.key, newvalue);
                                },
                                style: {
                                    cursor: 'pointer',
                                },
                            },  m(`i.${theme.icon}.${theme['icon-plus']}`, {
                                style: {
                                    margin: 0,
                                },
                            })),
                        ]),
                        m('.ui.content', [
                            // m(subinput, Object.assign({}, vnode.attrs, {value: subvalue})),
                        ]),
                    ]) : undefined,
                ])),
            ]);
        },
    };

    return BaseInput(repeater, def);
};

module.exports = Repeater;
