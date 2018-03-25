const Kernel = require('../src/Kernel.js');
const Service = require('../src/Kernel.js');

const TestService = Service.define('TestService', {
    type: 'test',
    actions: {},
});

describe('Kernel', () => {
    describe('init', () => {
        it('registers itself', () => {

        });
    });
});
