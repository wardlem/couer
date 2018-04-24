
const merge = require('merge-descriptors');
const pluralize = require('pluralize');
const ListUI = require('./listui');
const debug = require('debug')('couer:ui:modelui');
const {bindClosure} = require('couer-util');

function ModelUI(options) {
    const Model = options.model;
    const {
        basepath = Model.collectionName,
        apipath = `/${Model.collectionName.toLowerCase()}`,
        displayKey = Model.pk,
        listType = 'table',
        displayType = 'display',
        createType = 'form',
        editType = 'form',
        deleteType = 'form',
        menuTitle = pluralize(Model.name),
        listTitle = menuTitle,
        displayTitle = displayKey
            ? bindClosure((m, o) => [m('a[href="./"]', {oncreate: m.route.link}, [listTitle]), o[displayKey]], {listTitle, displayKey})
            : bindClosure((m, o) => [m('a[href="./"]', {oncreate: m.route.link}, [listTitle]), 'View'], {listTitle}),
        createTitle = bindClosure((m, o) => [m('a[href="./"]', {oncreate: m.route.link}, [listTitle]), 'New'], {listTitle}),
        editTitle = displayKey
            ? bindClosure((m, o) => [m('a[href="../"]', {oncreate: m.route.link}, [listTitle]), m('a[href="./"]', {oncreate: m.route.link}, o[displayKey]), 'Edit'], {listTitle, displayKey})
            :  bindClosure((m, o) => [m('a[href="../"]', {oncreate: m.route.link}, [listTitle]), m('a[href="./"]', {oncreate: m.route.link}, 'Item'), 'Edit'], {listTitle}),
        deleteTitle = displayKey
            ? bindClosure((m, o) => [m('a[href="../"]', {oncreate: m.route.link}, [listTitle]), m('a[href="./"]', {oncreate: m.route.link}, o[displayKey]), 'Delete'], {listTitle, displayKey})
            :  bindClosure((m, o) => [m('a[href="../"]', {oncreate: m.route.link}, [listTitle]), m('a[href="./"]', {oncreate: m.route.link}, 'Item'), 'Delete'], {listTitle}),
        labels = {},
        columns = null,
        fields = null,
    } = options;

    return {
        Model,
        basepath,
        apipath,
        listType,
        displayType,
        createType,
        deleteType,
        menuTitle,
        editType,
        listTitle,
        displayTitle,
        editTitle,
        createTitle,
        deleteTitle,
        labels,
        columns,
        fields,
        __proto__: ModelUI.prototype,
    };
}

merge(ModelUI.prototype, {
    definition(config) {
        return [
            this.listDefinition(config),
            this.createDefinition(config),
            this.displayDefinition(config),
            this.editDefinition(config),
            this.deleteDefinition(config),
        ];
    },

    listDefinition(ui) {
        const {apiurl, basepath} = ui;
        return ListUI({
            type: this.listType,
            path: this.basepath,
            menuTitle: this.menuTitle,
            contextTitle: 'List',
            contextIcon: '.list',
            contextKey: this.menuTitle,
            activeMenu: this.menuTitle,
            datasource: `${apiurl}${this.apipath}`,
            title: this.listTitle,
            columns: this.buildColumns(ui),
            itemlink: `${basepath}/${this.basepath}/:${this.Model.pk}/edit`,
        }).definition(ui);
    },

    createDefinition(ui) {
        const {basepath, apiurl} = ui;
        return {
            type: this.createType,
            path: `${basepath}/${this.basepath}/new`,
            contextTitle: 'New',
            contextIcon: '.plus',
            contextKey: this.menuTitle,
            activeMenu: this.menuTitle,
            title: this.createTitle,
            fields: this.buildFields(ui),
            submitUrl: `${apiurl}${this.apipath}`,
            submitMethod: 'POST',
            redirect: `${basepath}/${this.basepath}/:${this.Model.pk}`,
        };
    },

    deleteDefinition({basepath, apiurl}) {
        return {
            type: this.createType,
            path: `${basepath}/${this.basepath}/:id/delete`,
            activeMenu: this.menuTitle,
            title: this.deleteTitle,
        };
    },

    editDefinition(ui) {
        const {basepath, apiurl} = ui;
        return {
            type: this.editType,
            path: `${basepath}/${this.basepath}/:${this.Model.pk}/edit`,
            activeMenu: this.menuTitle,
            title: this.editTitle,
            fields: this.buildFields(ui),
            submitUrl: `${apiurl}${this.apipath}/:${this.Model.pk}`,
            redirect: `${basepath}/${this.basepath}/:${this.Model.pk}`,
            submitMethod: 'PATCH',
            loadUrl: `${apiurl}${this.apipath}/:${this.Model.pk}`,
        };
    },

    displayDefinition({basepath, apiurl}) {
        return {
            type: this.displayType,
            path: `${basepath}/${this.basepath}/:id`,
            activeMenu: this.menuTitle,
            title: this.displayTitle,
        };
    },

    buildColumns(ui) {
        if (this.columns != null) {
            return this.columns.map((column) => {
                if (typeof column === 'string') {
                    column = {key: column};
                }
                const key = column.key;
                return Object.assign({
                    key,
                    label: this.labels[key] || key,
                    display: key,
                    sortable: false,
                }, column);
            });
        } else {
            const storedProperties = this.Model._storedProperties;
            return Object.keys(storedProperties).reduce((res, key) => {
                const prop = storedProperties[key];
                if (prop.isprotected) {
                    return res;
                }
                return res.concat([{
                    key,
                    label: this.labels[key] || key,
                    display: key,
                    sortable: false,
                }]);
            }, []);
        }
    },

    mergeField(base, extension) {
        if (typeof extension === 'string') {
            extension = {key: extension};
        }

        let newbase = Object.assign({}, base || {}, extension);

        if (extension.subdef) {
            newbase.subdef = this.mergeField(base.subdef || {}, extension.subdef);
        } else if (extension.subform) {
            const basesubform = base.subform || [];
            newbase.subform = extension.subform.map((sub) => {
                let key = typeof sub === 'string' ? sub : sub.key;
                const basesubdef = basesubform.reduce((res, def) => {
                    if (res) {
                        return res;
                    }
                    if (def.key === key) {
                        return def;
                    }

                    return res;
                }, null);

                return this.mergeField(basesubdef || {}, sub);
            });
        }

        return newbase;
    },

    buildFields(ui) {
        if (this.fields != null) {
            return this.fields.map((field) => {
                if (typeof field === 'string') {
                    field = {key: field};
                }
                const key = field.key;
                const prop = this.Model.schema.properties[key];
                const basedef = prop ? prop.formdef(key) : {};
                if (key === this.Model.pk) {
                    basedef.type = 'hidden';
                }
                return this.mergeField(basedef, field);
            });
        } else {
            const storedProperties = this.Model._storedProperties;
            return Object.keys(storedProperties).reduce((res, key) => {
                const prop = storedProperties[key];
                if (prop.isprotected) {
                    return res;
                }
                const def = prop.formdef(key);
                if (key === this.Model.pk || prop.ishidden) {
                    def.type = 'hidden';
                }
                return res.concat([def]);
            }, []);
        }
    },
});

module.exports = ModelUI;
