const {uneval} = require('couer-util');
const {resolve} = require('path');
module.exports = function generateUserInterfaceJavascript(data, viewpaths) {

    const appDataSrc = uneval(data);
    const viewpathsSrc = Object.keys(viewpaths).map((viewname) => {
        const viewpath = viewpaths[viewname];
        return `${viewname}: require('${viewpath}')`;
    }).join(', ');

    return `
        if (typeof window.Couer !== 'object') {
            window.Couer = {};
        }

        var views = {${viewpathsSrc}};
        window.Couer.UI = require('${resolve(__dirname, '../client/src/js/couerui.js')}');
        window.Couer.appdata = ${appDataSrc};
        window.Couer.views = views;
        window.Couer.theme = require('${data.themepath}');
    `;
};
