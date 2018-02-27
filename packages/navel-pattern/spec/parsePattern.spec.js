const parsePattern = require('../src/parsePattern');
const {
    $$END_OF_PATTERN,
    $$STAR,
    $$GLOBSTAR,
} = require('../src/constants');

describe('parsePattern', () => {
    it('is a function', () => {
        expect(typeof parsePattern).toBe('function');
    });

    it('takes a string with no wildcards and returns the path', () => {
        expect(parsePattern('first:second:third')).toEqual([
            'first',
            'second',
            'third',
            $$END_OF_PATTERN,
        ]);
    });

    it('finds a star in the path', () => {
        expect(parsePattern('first:*:third')).toEqual([
            'first',
            $$STAR,
            'third',
            $$END_OF_PATTERN,
        ]);

        expect(parsePattern('*:second:third')).toEqual([
            $$STAR,
            'second',
            'third',
            $$END_OF_PATTERN,
        ]);

        expect(parsePattern('first:second:*')).toEqual([
            'first',
            'second',
            $$STAR,
            $$END_OF_PATTERN,
        ]);
    });

    it('finds a globstar in the path', () => {
        expect(parsePattern('first:**:third')).toEqual([
            'first',
            $$GLOBSTAR,
            'third',
            $$END_OF_PATTERN,
        ]);

        expect(parsePattern('**:second:third')).toEqual([
            $$GLOBSTAR,
            'second',
            'third',
            $$END_OF_PATTERN,
        ]);

        expect(parsePattern('first:second:**')).toEqual([
            'first',
            'second',
            $$GLOBSTAR,
            $$END_OF_PATTERN,
        ]);
    });

    it('does not match a star or globstar if it is not a complete part of the path', () => {
        expect(parsePattern('first:s*:third')).toEqual([
            'first',
            's*',
            'third',
            $$END_OF_PATTERN,
        ]);

        expect(parsePattern('first:*d:third')).toEqual([
            'first',
            '*d',
            'third',
            $$END_OF_PATTERN,
        ]);
    });

    it('allows a separator or star to be escaped with a backslash', () => {
        expect(parsePattern('first:\\*:third')).toEqual([
            'first',
            '*',
            'third',
            $$END_OF_PATTERN,
        ]);

        expect(parsePattern('first:sec\\:ond:third')).toEqual([
            'first',
            'sec:ond',
            'third',
            $$END_OF_PATTERN,
        ]);
    });

    it('adds an empty path part when pattern ends with separator', () => {
        expect(parsePattern('first:second:third:')).toEqual([
            'first',
            'second',
            'third',
            '',
            $$END_OF_PATTERN,
        ]);
    });

    it('adds an empty path part at the beginning when pattern starts with separator', () => {
        expect(parsePattern(':first:second:third')).toEqual([
            '',
            'first',
            'second',
            'third',
            $$END_OF_PATTERN,
        ]);
    });

    it('includes an empty string in the path if the path is empty', () => {
        expect(parsePattern('')).toEqual([
            '',
            $$END_OF_PATTERN,
        ]);
    });

    it('returns the whole string as a pattern if the sep is empty', () => {
        expect(parsePattern('first:second:third', {sep: ''})).toEqual([
            'first:second:third',
            $$END_OF_PATTERN,
        ]);
    });

    it('does not parse stars and globs if the pathonly option is true', () => {
        expect(parsePattern('first:*:**', {pathonly: true})).toEqual([
            'first',
            '*',
            '**',
            $$END_OF_PATTERN,
        ]);
    });
});
