const PatternTree = require('../src/PatternTree');

const {
    $$END_OF_PATTERN,
    $$STAR,
    $$GLOBSTAR,
} = require('../src/constants');

describe('PatternTree', () => {
    it('is a function', () => {
        expect(typeof PatternTree).toBe('function');
    });

    it('it returns an object', () => {
        const node = PatternTree(PatternTree.$$trunk, 'berry', new Map());

        expect(node.type).toBe(PatternTree.$$trunk);
        expect(node.data).toBe('berry');
        expect(node.children).toEqual(new Map());
    });

    describe('prototype', () => {
        describe('Symbol.toStringTag', () => {
            // TODO
        });

        describe('istrunk', () => {
            it('is true if the node is a trunk', () => {
                const trunk = PatternTree(PatternTree.$$trunk, 'berry', new Map());
                expect(trunk.istrunk).toBe(true);
            });

            it('is false if the node is not a trunk', () => {
                const branch = PatternTree(PatternTree.$$branch, 'berry', new Map());
                expect(branch.istrunk).toBe(false);

                const leaf = PatternTree(PatternTree.$$leaf, 'berry', new Set());
                expect(leaf.istrunk).toBe(false);
            });
        });

        describe('isbranch', () => {
            it('is true if the node is a branch', () => {
                const branch = PatternTree(PatternTree.$$branch, 'berry', new Map());
                expect(branch.isbranch).toBe(true);

            });

            it('is false if the node is not a branch', () => {
                const trunk = PatternTree(PatternTree.$$trunk, 'berry', new Map());
                expect(trunk.isbranch).toBe(false);

                const leaf = PatternTree(PatternTree.$$leaf, 'berry', new Set());
                expect(leaf.isbranch).toBe(false);
            });
        });

        describe('isleaf', () => {
            it('is true if the node is a leaf', () => {
                const leaf = PatternTree(PatternTree.$$leaf, 'berry', new Set());
                expect(leaf.isleaf).toBe(true);
            });

            it('is false if the node is not a leaf', () => {
                const trunk = PatternTree(PatternTree.$$trunk, 'berry', new Map());
                expect(trunk.isleaf).toBe(false);

                const branch = PatternTree(PatternTree.$$branch, 'berry', new Map());
                expect(branch.isleaf).toBe(false);
            });
        });

        describe('isempty', () => {
            it('is true if the node has no children', () => {
                const trunk = PatternTree(PatternTree.$$trunk, 'berry', new Map());
                expect(trunk.isempty).toBe(true);
            });

            it('is false if the node does have children', () => {
                const branch = PatternTree(PatternTree.$$branch, 'berry', new Map());
                const trunk = PatternTree(PatternTree.$$trunk, null, new Map([['berry', branch]]));
                expect(trunk.isempty).toBe(false);
            });
        });

        describe('with', () => {
            it('adds a pattern to the tree', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk().with(pattern, 127);

                expect(trunk.isempty).toBe(false);
                expect(trunk.children.size).toBe(1);
                expect(trunk.children.has('a')).toBe(true);

                const branchA = trunk.children.get('a');
                expect(branchA.type).toBe(PatternTree.$$branch);
                expect(branchA.isempty).toBe(false);
                expect(branchA.children.size).toBe(1);
                expect(branchA.children.has('b')).toBe(true);

                const branchB = branchA.children.get('b');
                expect(branchB.type).toBe(PatternTree.$$branch);
                expect(branchB.isempty).toBe(false);
                expect(branchB.children.size).toBe(1);
                expect(branchB.children.has('c')).toBe(true);

                const branchC = branchB.children.get('c');
                expect(branchC.type).toBe(PatternTree.$$branch);
                expect(branchC.isempty).toBe(false);
                expect(branchC.children.size).toBe(1);
                expect(branchC.children.has($$END_OF_PATTERN)).toBe(true);

                const branchEnd = branchC.children.get($$END_OF_PATTERN);
                expect(branchEnd.type).toBe(PatternTree.$$leaf);
                expect(branchEnd.isempty).toBe(false);
                expect(branchEnd.children.size).toBe(1);
                expect(branchEnd.children.has(127)).toBe(true);
            });

            it('appens a pattern to the tree if the path exists', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                expect(trunk.isempty).toBe(false);
                expect(trunk.children.size).toBe(1);
                expect(trunk.children.has('a')).toBe(true);

                const branchA = trunk.children.get('a');
                expect(branchA.type).toBe(PatternTree.$$branch);
                expect(branchA.isempty).toBe(false);
                expect(branchA.children.size).toBe(1);
                expect(branchA.children.has('b')).toBe(true);

                const branchB = branchA.children.get('b');
                expect(branchB.type).toBe(PatternTree.$$branch);
                expect(branchB.isempty).toBe(false);
                expect(branchB.children.size).toBe(1);
                expect(branchB.children.has('c')).toBe(true);

                const branchC = branchB.children.get('c');
                expect(branchC.type).toBe(PatternTree.$$branch);
                expect(branchC.isempty).toBe(false);
                expect(branchC.children.size).toBe(1);
                expect(branchC.children.has($$END_OF_PATTERN)).toBe(true);

                const branchEnd = branchC.children.get($$END_OF_PATTERN);
                expect(branchEnd.type).toBe(PatternTree.$$leaf);
                expect(branchEnd.isempty).toBe(false);
                expect(branchEnd.children.size).toBe(2);
                expect(branchEnd.children.has(127)).toBe(true);
                expect(branchEnd.children.has(145)).toBe(true);
            });

            it('does nothing if the item already exists at the path', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk().with(pattern, 127);

                expect(trunk.with(pattern, 127)).toBe(trunk);
            });
        });

        describe('without', () => {
            it('removes an item at a given path', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                    .without(pattern, 127)
                ;

                expect(trunk.isempty).toBe(false);
                expect(trunk.children.size).toBe(1);
                expect(trunk.children.has('a')).toBe(true);

                const branchA = trunk.children.get('a');
                expect(branchA.type).toBe(PatternTree.$$branch);
                expect(branchA.isempty).toBe(false);
                expect(branchA.children.size).toBe(1);
                expect(branchA.children.has('b')).toBe(true);

                const branchB = branchA.children.get('b');
                expect(branchB.type).toBe(PatternTree.$$branch);
                expect(branchB.isempty).toBe(false);
                expect(branchB.children.size).toBe(1);
                expect(branchB.children.has('c')).toBe(true);

                const branchC = branchB.children.get('c');
                expect(branchC.type).toBe(PatternTree.$$branch);
                expect(branchC.isempty).toBe(false);
                expect(branchC.children.size).toBe(1);
                expect(branchC.children.has($$END_OF_PATTERN)).toBe(true);

                const branchEnd = branchC.children.get($$END_OF_PATTERN);
                expect(branchEnd.type).toBe(PatternTree.$$leaf);
                expect(branchEnd.isempty).toBe(false);
                expect(branchEnd.children.size).toBe(1);
                expect(branchEnd.children.has(145)).toBe(true);
            });

            it('removes empty nodes', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .without(pattern, 127)
                ;

                expect(trunk.isempty).toBe(true);
            });

            it('modifies nothing if the path does not exist', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                ;

                expect(trunk.without(pattern, 179)).toBe(trunk);
                expect(trunk.without('a:b:d', 127)).toBe(trunk);

            });
        });

        describe('search', () => {
            it('fetches all items at a path', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search(pattern);

                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(2);
                expect(values).toContain(127);
                expect(values).toContain(145);
            });

            it('does not return items that do not match the path', () => {
                const pattern = 'a:b:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:d');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(0);
            });

            it('matches a single path part if a star is used', () => {
                const pattern = 'a:*:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:c');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(2);
                expect(values).toContain(127);
                expect(values).toContain(145);
            });

            it('combines all matches into one array', () => {
                const trunk = PatternTree.Trunk()
                    .with('a:*:c', 127)
                    .with('*:b:c', 145)
                    .with('a:b:c', 190)
                    .with('a:b:d', 178)
                ;

                const values = trunk.search('a:b:c');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(3);
                expect(values).toContain(127);
                expect(values).toContain(145);
                expect(values).toContain(190);
            });

            it('does not match two path parts with a star', () => {
                const pattern = '*:*:*';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:c:d');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(0);
            });

            it('matches one path part with a globstar', () => {
                const pattern = 'a:**:c';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:c');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(2);
                expect(values).toContain(127);
                expect(values).toContain(145);
            });

            it('matches multiple path parts with a globstar', () => {
                const pattern = 'a:**:f';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:c:d:e:f');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(2);
                expect(values).toContain(127);
                expect(values).toContain(145);
            });

            it('matches multiple path parts with a globstar followed by a star', () => {
                const pattern = 'a:**:*:f';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:c:d:e:f');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(2);
                expect(values).toContain(127);
                expect(values).toContain(145);
            });

            it('does not match only one part with a globstar followed by a star', () => {
                const pattern = 'a:**:*:f';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:f');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(0);
            });

            it('matches multiple path parts with a globstar followed by a globstar', () => {
                const pattern = 'a:**:**:f';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:c:d:e:f');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(2);
                expect(values).toContain(127);
                expect(values).toContain(145);
            });

            it('does not match only one part with a globstar followed by a globstar', () => {
                const pattern = 'a:**:**:f';
                const trunk = PatternTree.Trunk()
                    .with(pattern, 127)
                    .with(pattern, 145)
                ;

                const values = trunk.search('a:b:f');
                expect(typeof values).toBe('object');
                expect(values.constructor).toBe(Array);
                expect(values.length).toBe(0);
            });


        });

    });
});
