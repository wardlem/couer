const Pipeline = require('./Pipeline');

module.exports = function(key = '_method') {
    return (req, res) => Pipeline.next(
        req.body[key] ? req.update({method: req.body[key]}) : req,
        res
    );
};
