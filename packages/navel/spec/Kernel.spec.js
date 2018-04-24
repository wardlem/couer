const Kernel = require('../src/Kernel.js');
const Service = require('../src/Service.js');

describe('Kernel', () => {
    it('is a function', () => {
        expect(Kernel).toBeInstanceOf(Function);
    });

    it('creates an instance of Kernel', () => {
        expect(Kernel('main')).toBeInstanceOf(Kernel);
    });

    it('creates an instance of Service', () => {
        expect(Kernel('main')).toBeInstanceOf(Service);
    });

    it('names the Kernel', () => {
        expect(Kernel('main').name).toBe('main');
    });

    it('creates a kernel with type of `kernel`', () => {
        expect(Kernel('main').type).toBe('kernel');
    });

    it('registers itself', () => {
        expect(Kernel('main').hasService('main')).toBe(true);
    });

    describe('#boot', () => {
        it('reads the services in a configuration and registers them', (done) => {
            const config = {
                services: {
                    test: {
                        path: require('path').resolve(__dirname, './data/TestService'),
                        options: {},
                    },
                },
            };

            const kernel = Kernel('main');
            kernel.boot(config).fork(done, () => {
                expect(kernel.hasService('test')).toBe(true);
                done();
            });
        });
    });
});
