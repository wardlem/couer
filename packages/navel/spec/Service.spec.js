const Service = require('../src/Service');
const Future = require('fluture');

describe('Service', () => {
    it('is a function', () => {
        expect(Service).toBeDefined();
        expect(typeof Service).toBe('function');
    });

    describe('#define', () => {
        it('creates a service factory function', () => {
            const SampleService = Service.define('SampleService');

            expect(typeof SampleService).toBe('function');
            expect(SampleService('sample') instanceof SampleService).toBe(true);
        });

        it('instances of the defined service are instances of Service', () => {
            expect(Service.define('SampleService')('sample') instanceof Service).toBe(true);
        });

        it('instances of the defined service have a custom tag tag', () => {
            const sampleService = Service.define('SampleService')('sample');
            expect(Object.prototype.toString.call(sampleService)).toBe('[object SampleService]');
        });

        it('allows a service type to be set', () => {
            const sampleService = Service.define('SampleService', {type: 'dishwasher'})('sample');
            expect(sampleService.type).toBe('dishwasher');
        });

        it('allows for an intializing function to be set', () => {
            const init = function() {
                this.whatever = 'something';
            };

            const sampleService = Service.define('SampleService', {init})('sample');
            expect(sampleService.whatever).toBe('something');
        });

        it('attaches passed in actions to the prototype', () => {
            const actions = {
                shortdesc() { return `${this.name}:${this.type}`; },
            };

            const sampleService = Service.define('SampleService', {actions})('sample');
            expect(typeof sampleService.shortdesc).toBe('function');
            expect(sampleService.shortdesc()).toBe('sample:service');
            expect(sampleService.respondsTo('shortdesc')).toBe(true);
        });

        it('allows non-action prototype methods to be set', () => {
            const proto = {
                shortdesc() { return `${this.name}:${this.type}`; },
            };

            const sampleService = Service.define('SampleService', {proto})('sample');
            expect(typeof sampleService.shortdesc).toBe('function');
            expect(sampleService.shortdesc()).toBe('sample:service');
            expect(sampleService.respondsTo('shortdesc')).toBe(false);
        });
    });

    describe('.source', () => {
        it('returns an object with the basic details of the service', () => {
            const SampleService = Service.define('SampleService');
            const service = SampleService('sample');
            const id = 'ABACUS';
            service.id = id;
            service._outbox = () => {};

            expect(service.source).toEqual({
                id: 'ABACUS',
                name: 'sample',
                type: 'service',
            });
        });
    });

    describe('#_inbox', () => {
        it('receives a message and returns the result of calling an action', () => {
            const actions = {
                test() { return 'test passed'; },
            };

            const message = {
                source: {id: '123', name: 'something', type: 'whatever'},
                action: 'test',
                data: null,
            };

            const sampleService = Service.define('SampleService', {actions})('sample');
            const res = sampleService._inbox(message);

            expect(res).toBe('test passed');
        });

        it('passes data to the method', () => {
            const actions = {
                test({value}) { return value + 7; },
            };

            const message = {
                source: {id: '123', name: 'something', type: 'whatever'},
                action: 'test',
                data: {value: 5},
            };

            const sampleService = Service.define('SampleService', {actions})('sample');
            const res = sampleService._inbox(message);

            expect(res).toBe(12);
        });

        it('passes the source to the method', () => {
            const actions = {
                test(_, source) { return `thanks ${source.name}`; },
            };

            const message = {
                source: {id: '123', name: 'johnny', type: 'whatever'},
                action: 'test',
                data: {value: 5},
            };

            const sampleService = Service.define('SampleService', {actions})('sample');
            const res = sampleService._inbox(message);

            expect(res).toBe('thanks johnny');
        });

        it('returns a future that rejects with an ActionNotFoundError', (done) => {
            const actions = {
            };

            const message = {
                source: {id: '123', name: 'johnny', type: 'whatever'},
                action: 'test',
                data: {value: 5},
            };

            const sampleService = Service.define('SampleService', {actions})('sample');
            const res = sampleService._inbox(message);

            expect(Future.isFuture(res)).toBe(true);
            res.fork((err) => {
                expect(err.constructor.name).toBe('ActionNotFoundError');
                done();
            }, done);
        });
    });

    describe('#broadcast', () => {
        it('sends a message to the service\'s outbox', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.broadcast('somechannel');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);
        });

        it('sets the data property of the message to the passed in data', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.broadcast('somechannel', 126);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].data).toBe(126);
        });

        it('includes the channel in the message', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.broadcast('somechannel', 126);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].channel).toBe('somechannel');
        });

        it('sets the message\'s destination to a nullish value', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.broadcast('somechannel', 126);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].destination).toBe(null);
        });

        it('sets the message\'s source to the service\'s source', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;
            sampleService.id = 'theid';
            sampleService.broadcast('somechannel', 126);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].source).toEqual({
                id: 'theid',
                name: 'sample',
                type: 'service',
            });
        });

        it('executes the future returned by the outbox', () => {
            let executed = false;
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                executed = true;
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.broadcast('somechannel');

            expect(executed).toBe(true);
        });

    });

    describe('#tell', () => {
        it('sends a message to the service\'s outbox', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.tell('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);
        });

        it('sets the data property of the message to the passed in data', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.tell('someservice', 'someaction', 539);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].data).toBe(539);
        });

        it('includes the destination in the message', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.tell('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].destination).toBe('someservice');
        });

        it('includes the action in the message', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.tell('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].action).toBe('someaction');
        });

        it('sets the message\'s channel property to be undefined', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.tell('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].channel).toBe(undefined);
        });

        it('sets the message\'s source to the service\'s source', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;
            sampleService.id = 'theid';
            sampleService.tell('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].source).toEqual({
                id: 'theid',
                name: 'sample',
                type: 'service',
            });
        });

        it('executes the future returned by the outbox', () => {
            let executed = false;
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                executed = true;
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.tell('someservice', 'someaction');

            expect(executed).toBe(true);
        });
    });

    describe('#ask', () => {
        it('sends a message to the service\'s outbox', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.ask('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);
        });

        it('sets the data property of the message to the passed in data', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.ask('someservice', 'someaction', 567);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].data).toBe(567);
        });

        it('includes the destination in the message', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.ask('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].destination).toBe('someservice');
        });

        it('includes the action in the message', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.ask('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].action).toBe('someaction');
        });

        it('sets the message\'s channel property to be undefined', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.ask('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].channel).toBe(undefined);
        });

        it('sets the message\'s source to the service\'s source', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;
            sampleService.id = 'theid';
            sampleService.ask('someservice', 'someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].source).toEqual({
                id: 'theid',
                name: 'sample',
                type: 'service',
            });
        });

        it('does not execute the future returned by the outbox', () => {
            let executed = false;
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                executed = true;
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.ask('someservice', 'someaction');

            expect(executed).toBe(false);
        });
    });

    describe('#seek', () => {
        it('sends a message to the service\'s outbox', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.seek('someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);
        });

        it('sets the data property of the message to the passed in data', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.seek('someaction', 567);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].data).toBe(567);
        });

        it('includes the destination in the message as an asterisk (*)', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.seek('someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].destination).toBe('*');
        });

        it('includes the action in the message', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.seek('someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].action).toBe('someaction');
        });

        it('sets the message\'s channel property to be undefined', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.seek('someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].channel).toBe(undefined);
        });

        it('sets the message\'s source to the service\'s source', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;
            sampleService.id = 'theid';
            sampleService.seek('someaction');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.argsFor(0)[0].source).toEqual({
                id: 'theid',
                name: 'sample',
                type: 'service',
            });
        });

        it('does not execute the future returned by the outbox', () => {
            let executed = false;
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                executed = true;
                res(null);
            }));

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            sampleService.seek('someaction');

            expect(executed).toBe(false);
        });
    });

    describe('#subscribe', () => {
        it('accepts a function as the handler', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            const handler = () => {};
            sampleService.subscribe('some:event', handler);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);

            const handlerId = outbox.calls.mostRecent().args[0].data.action;
            expect(typeof handlerId).toBe('string');
            expect(sampleService.respondsTo(handlerId)).toBe(true);
            expect(outbox.calls.mostRecent().args).toEqual([{
                destination: 'kernel',
                data: {
                    channel: 'some:event',
                    action: handlerId,
                },
                source: sampleService.source,
                action: 'subscription:create',
            }, false]);
        });

        it('accepts a valid action name as the handler', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService', {
                actions: {
                    ['handle:event']() {

                    },
                },
            })('sample');
            sampleService._outbox = outbox;

            sampleService.subscribe('some:event', 'handle:event');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);
            expect(outbox.calls.mostRecent().args).toEqual([{
                destination: 'kernel',
                data: {
                    channel: 'some:event',
                    action: 'handle:event',
                },
                source: sampleService.source,
                action: 'subscription:create',
            }, false]);
        });

        it('throws if the channel name is not a string', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            try {
                sampleService.subscribe(1, 'handle:event');
                expect(false).toBe(true);
            } catch (e) {
                expect(e.constructor.name).toBe('BadArgumentsError');
                expect(e instanceof Error).toBe(true);
            }
        });

        it('throws if the action is not a string or function', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            try {
                sampleService.subscribe('some:channel', 1);
                expect(false).toBe(true);
            } catch (e) {
                expect(e.constructor.name).toBe('BadArgumentsError');
                expect(e instanceof Error).toBe(true);
            }
        });

        it('throws if the action name is not valid', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            try {
                sampleService.subscribe('some:channel', 'nonexistent:action');
                expect(false).toBe(true);
            } catch (e) {
                expect(e.constructor.name).toBe('BadArgumentsError');
                expect(e instanceof Error).toBe(true);
            }
        });
    });

    describe('#unsubscribe', () => {
        it('accepts a function as the handler', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            const handler = () => {};
            sampleService.subscribe('some:event', handler);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);

            const handlerId = outbox.calls.mostRecent().args[0].data.action;
            expect(typeof handlerId).toBe('string');
            expect(sampleService.respondsTo(handlerId)).toBe(true);
            expect(outbox.calls.mostRecent().args).toEqual([{
                destination: 'kernel',
                data: {
                    channel: 'some:event',
                    action: handlerId,
                },
                source: sampleService.source,
                action: 'subscription:create',
            }, false]);

            sampleService.unsubscribe('some:event', handler);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(2);

            expect(outbox.calls.mostRecent().args).toEqual([{
                destination: 'kernel',
                data: {
                    channel: 'some:event',
                    action: handlerId,
                },
                source: sampleService.source,
                action: 'subscription:remove',
            }, false]);

            expect(sampleService.respondsTo(handlerId)).toBe(false);
        });

        it('accepts a valid action name as the handler', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService', {
                actions: {
                    ['handle:event']() {

                    },
                },
            })('sample');
            sampleService._outbox = outbox;

            sampleService.subscribe('some:event', 'handle:event');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(1);
            expect(outbox.calls.mostRecent().args).toEqual([{
                destination: 'kernel',
                data: {
                    channel: 'some:event',
                    action: 'handle:event',
                },
                source: sampleService.source,
                action: 'subscription:create',
            }, false]);

            sampleService.unsubscribe('some:event', 'handle:event');

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(2);
            expect(outbox.calls.mostRecent().args).toEqual([{
                destination: 'kernel',
                data: {
                    channel: 'some:event',
                    action: 'handle:event',
                },
                source: sampleService.source,
                action: 'subscription:remove',
            }, false]);

        });

        it('throws if the channel name is not a string', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            try {
                sampleService.unsubscribe(1, 'handle:event');
                expect(false).toBe(true);
            } catch (e) {
                expect(e.constructor.name).toBe('BadArgumentsError');
                expect(e instanceof Error).toBe(true);
            }
        });

        it('does not delete the handler if the same function is used twice', () => {
            const outbox = jasmine.createSpy('outbox').and.returnValue(Future((rej,res) => {
                res(null);
            }));

            outbox.source = {
                id: 'kernel',
                name: 'kernel',
                type: 'kernel',
            };

            const sampleService = Service.define('SampleService')('sample');
            sampleService._outbox = outbox;

            const handler = () => {};
            sampleService.subscribe('some:event', handler);
            sampleService.subscribe('some:other:event', handler);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(2);

            const handlerId = outbox.calls.mostRecent().args[0].data.action;
            expect(typeof handlerId).toBe('string');
            expect(sampleService.respondsTo(handlerId)).toBe(true);

            sampleService.unsubscribe('some:event', handler);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(3);
            expect(sampleService.respondsTo(handlerId)).toBe(true);

            sampleService.unsubscribe('some:other:event', handler);

            expect(outbox).toHaveBeenCalled();
            expect(outbox.calls.count()).toBe(4);
            expect(sampleService.respondsTo(handlerId)).toBe(false);
        });
    });
});
