const util = require('util');

const mergeDescriptors = require('merge-descriptors');

const parsePattern = require('./parsePattern');
const {
    $$END_OF_PATTERN,
    $$STAR,
    $$GLOBSTAR,
} = require('../src/constants');

const stringtags = new Map();

function PatternTree(type, data, children) {
    return {
        get type() { return type; },
        get data() { return data; },
        get children() { return children; },
        get [Symbol.toStringTag]() { return `PatternTree.${stringtags.get(this.type)}`; },
        __proto__: PatternTree.prototype,
    };
}

const $$trunk = PatternTree.$$trunk = Symbol('trunk');
const $$branch = PatternTree.$$branch = Symbol('branch');
const $$leaf = PatternTree.$$leaf = Symbol('leaf');

stringtags.set($$trunk, 'Trunk');
stringtags.set($$branch, 'Branch');
stringtags.set($$leaf, 'Leaf');


mergeDescriptors(PatternTree.prototype, {
    get istrunk() { return this.type === $$trunk; },
    get isbranch() { return this.type === $$branch; },
    get isleaf() { return this.type === $$leaf; },
    get isempty() { return this.children.size === 0; },
    inspect(depth, options) {
        if (depth < 0) { return options.stylize(`[${this[Symbol.toStringTag]}]`, 'special'); }
        return options.stylize(this[Symbol.toStringTag], 'special') + ' ' + util.inspect({
            data: this.data,
            children: this.children,
        }, depth, options);
    },
    ['with'](pattern, data) {
        if (typeof pattern === 'string') {
            pattern = parsePattern(pattern);
        }


        if (this.isleaf) {
            if (this.children.has(data)) {
                return this;
            }
            const newChildren = new Set(this.children);
            newChildren.add(data);
            return PatternTree.Leaf(this.data, newChildren);
        }

        const [head, ...tail] = pattern;
        let child, original;
        if (this.children.has(head)) {
            original = this.children.get(head);
            child = original.with(tail, data);
        } else if (head === $$END_OF_PATTERN) {
            child = PatternTree.Leaf(head, new Set([data]));
        } else {
            child = PatternTree.Branch(head).with(tail, data);
        }

        // small optimization to avoid creating a new node
        // if no changes were made
        if (child !== original) {
            const newChildren = new Map(this.children);
            newChildren.set(head, child);

            return PatternTree(this.type, this.data, newChildren);
        }

        return this;
    },

    without(pattern, data) {
        if (typeof pattern === 'string') {
            pattern = parsePattern(pattern);
        }

        if (this.isleaf) {
            if (!this.children.has(data)) {
                return this;
            }

            const newChildren = new Set(this.children);
            newChildren.delete(data);

            return PatternTree.Leaf(this.data, newChildren);
        }

        const [head, ...tail] = pattern;
        let child, original;
        if (this.children.has(head)) {
            original = this.children.get(head);
            child = original.without(tail, data);

            if (original !== child) {
                const newChildren = new Map(this.children);
                if (child.isempty) {
                    // remove the node if there is no longer a need for it
                    newChildren.delete(head);
                } else {
                    // otherwise set the new version
                    newChildren.set(head, child);
                }

                return PatternTree(this.type, this.data, newChildren);
            }
        }

        // if the pattern does not exist in the tree,
        // just return the existing node so we don't have
        // to create and then gc an identical one
        return this;
    },

    search(pattern) {
        if (typeof pattern === 'string') {
            pattern = parsePattern(pattern, {pathonly: true});
        }

        if (this.isleaf) {
            if (pattern.length !== 0) {
                // this shouldn't ever happen I don't think
                return [];
            }

            return Array.from(this.children);
        } else if (this.data === $$GLOBSTAR) {
            if (this.children.has($$GLOBSTAR)) {
                // A double globstar means that the pattern needs to match
                // two or more directories. The simplest way to implement this
                // is to simply skip to the child globstar and let it handle
                // all the business

                return this.children.get($$GLOBSTAR).search(pattern.slice(1));
            }

            return pattern.reduce((result, part, index) => {
                if (this.children.has(part)) {
                    result = result.concat(this.children.get(part).search(pattern.slice(index + 1)));
                }
                if (this.children.has($$STAR) && part !== $$END_OF_PATTERN) {
                    result = result.concat(this.children.get($$STAR).search(pattern.slice(index + 1)));
                }

                return result;
            }, []);
        }

        const [head, ...tail] = pattern;
        let result = [];
        if (this.children.has(head)) {
            result = this.children.get(head).search(tail);
        }
        if (head !== $$END_OF_PATTERN && this.children.has($$STAR)) {
            result = result.concat(this.children.get($$STAR).search(tail));
        }
        if (head !== $$END_OF_PATTERN && this.children.has($$GLOBSTAR)) {
            result = result.concat(this.children.get($$GLOBSTAR).search(tail));
        }

        if (this.istrunk) {
            // remove duplicates
            return Array.from(new Set(result));
        }

        return result;
    },
});

PatternTree.Trunk = function Trunk(children = new Map()) {
    return PatternTree($$trunk, null, children);
};

PatternTree.Branch = function Branch(data, children = new Map()) {
    return PatternTree($$branch, data, children);
};

PatternTree.Leaf = function Leaf(data, children = new Set()) {
    return PatternTree($$leaf, data, children);
};

module.exports = PatternTree;
