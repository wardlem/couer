const Config = require('../src/Config');
const {resolve} = require('path');

describe('Config', () => {
    describe('.load', () => {
        it('reads a yaml file', (done) => {
            Config.load(resolve(__dirname, './data/simple.yml'))
                .fork(done, (config) => {
                    expect(config.data.key).toEqual('yaml');
                    expect(config instanceof Config).toBe(true);
                    done();
                });
        });

        it('reads a json file', (done) => {
            Config.load(resolve(__dirname, './data/simple.json'))
                .fork(done, (config) => {
                    expect(config.data.key).toEqual('json');
                    expect(config instanceof Config).toBe(true);
                    done();
                });
        });

        it('reads a js file', (done) => {
            Config.load(resolve(__dirname, './data/simple.js'))
                .fork(done, (config) => {
                    expect(config.data.key).toEqual('js');
                    expect(config instanceof Config).toBe(true);
                    done();
                });
        });
    });
});
