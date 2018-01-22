const m = require('mithril');
const BaseInput = require('./BaseInput.js');

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
            } = vnode.attrs;

            return m('.ui.segment', [
                m('.ui.sub.header', [def.label]),
                m('.ui.striped.items', (value || []).map((subvalue, index) => {
                    const suboninput = (subkey, newsubvalue) => {
                        console.log('subform suboniput', subkey, index, newsubvalue);
                        const newvalue = value.slice(0, index).concat([newsubvalue]).concat(value.slice(index + 1));
                        oninput(def.key, newvalue);
                    };
                    return [m('.item', [
                        m('', {
                            style: {
                                marginRight: '0.75rem',
                            },
                        }, [
                            m('.ui.right.floated.red.circular.label', {
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
                            }, (repeater.hovered === index) ? m('i.trash.icon', {
                                style: {
                                    margin: 0,
                                },
                            }) : [String(index + 1)]),
                        ]),
                        m('.ui.content', [
                            m(subinput, Object.assign({}, vnode.attrs, {value: subvalue, name: `${name}[${index}]`, oninput: suboninput})),
                        ]),
                    ]), m('.ui.divider')];
                }).concat([
                    value.length < maxlen ? m('.item', [
                        m('', {
                            style: {
                                marginRight: '0.75rem',
                            },
                        }, [
                            m('.ui.right.floated.blue.circular.label', {

                                onclick: (e) => {

                                    console.log('add', value.length);
                                    const newitem = subinput.default();
                                    const newvalue = value.concat([newitem]);

                                    oninput(def.key, newvalue);
                                },
                                style: {
                                    cursor: 'pointer',
                                },
                            },  m('i.plus.icon', {
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
