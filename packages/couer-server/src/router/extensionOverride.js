const mimelib = require('mime');
const Pipeline = require('./Pipeline');
const debug = require('debug')('couer:server:router:extensionOverride');

module.exports = function static(options = {}) {
    return (req, res) => {
        const reg = /^(.+)\.([a-zA-Z]+)$/;
        const execRes = reg.exec(req.resource);
        if (execRes) {
            const base = execRes[1];
            const ext = execRes[2];
            const mime = mimelib.getType(ext);

            if (!mime) {
                return Pipeline.next(req, res);
            }

            debug('override accept mime type to ', mime);
            const newReq = req.update({
                resource: base,
                headers: Object.assign({}, req.headers, {accept: mime}),
            });

            return Pipeline.next(newReq, res);
        }

        return Pipeline.next(req, res);
    };
};
