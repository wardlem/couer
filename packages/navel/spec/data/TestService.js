const Service = require('../../src/Service.js');

const TestService = Service.define('TestService', {
    type: 'test',
    actions: {

    },
});
//
// TestService.resetCounts = () => {
//     Object.keys(counts).forEach((key) => counts[key] = 0);
// };

module.exports = TestService;
