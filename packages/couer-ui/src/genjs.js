// const generate = require('escodegen').generate;
// const lave = require('lave');
const uneval = require('../util/uneval');
module.exports = function generateUserInterfaceJavascript(data) {
    // const appData = {
    //     views: data.views,
    //     menulinks: data.menulinks,
    //     contextmenus: data.contextmenus,
    //     title: data.title,
    // };

    const appDataSrc = uneval(data);

    return `module.exports = ${appDataSrc}`;
};
