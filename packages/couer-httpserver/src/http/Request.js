const R = require('ramda');
const acceptslib = require('accepts');
const contenttype = require('content-type');
const typeis = require('type-is');
const cookieparser = require('cookie').parse;
const unsign = require('cookie-signature').unsign;
const mergeDescriptors = require('merge-descriptors');
const {stripQueryString} = require('couer-util');

const debug = require('debug')('couer:Request');


function Request(
    original,
    method,
    headers,
    resource,
    resourceBase,
    params,
    query,
    body,
    cookies,
    session,
    files,
    data
) {

    return {
        get original() { return original; },
        get method() { return method; },
        get headers() { return headers; },
        get resource() { return resource; },
        get resourceBase() { return resourceBase; },
        get url() { return original.url; },
        get params() { return params; },
        get query() { return query; },
        get body() { return body; },
        get cookies() { return cookies; },
        get session() { return session; },
        get files() { return files; },
        get data() { return data; },
        __proto__: Request.prototype,
    };
}

Request.fromNodeRequest = function fromNodeRequest(nodereq) {
    return Request(
        nodereq,
        nodereq.method,
        Object.assign({}, nodereq.headers),
        stripQueryString(nodereq.url),
        '',
        Object.freeze({}),
        {},
        {},
        {},
        {},
        {},
        {},
        {}
    );
};

mergeDescriptors(Request.prototype, {
    update(updates) {
        const {
            original = this.original,
            method = this.method,
            headers = this.headers,
            resource = this.resource,
            resourceBase = this.resourceBase,
            params = this.params,
            query = this.query,
            body = this.body,
            cookies = this.cookies,
            session = this.session,
            files = this.files,
            data = this.data,
        } = updates;

        return Request(
            original,
            method,
            headers,
            resource,
            resourceBase,
            params,
            query,
            body,
            cookies,
            session,
            files,
            data
        );
    },

    header(name) {
        const lcName = name.toLowerCase();

        switch (lcName) {
            case 'referer':
            case 'referrer':
                return this.headers.referrer || this.headers.referer;
            default:
                return this.headers[lcName];
        }
    },

    acceptType(types) {
        const accepts = acceptslib({headers: this.headers});
        const result = accepts.type(types);
        return result;
    },

    acceptEncoding(encodings) {
        const accepts = acceptslib({headers: this.headers});
        return accepts.encoding(encodings);
    },

    acceptCharset(charsets) {
        const accepts = acceptslib({headers: this.headers});
        return accepts.charset(charsets);
    },

    acceptLanguage(languages) {
        const accepts = acceptslib({headers: this.headers});
        return accepts.language(languages);
    },

    get contenttype() {
        const type = this.headers['content-type'];
        try {
            return type && contenttype.parse(type).type;
        } catch (e) {
            return undefined;
        }
    },

    get charset() {
        const type = this.headers['content-type'];
        try {
            return type && contenttype.parse(type).charset;
        } catch (e) {
            return undefined;
        }
    },

    is(types) {
        return typeis({headers: this.headers}, types);
    },

    ismethod(method) {
        return R.is(String, method) && method.toUpperCase() === this.method.toUpperCase();
    },

    get hasbody() {
        return typeis.hasBody({headers: this.headers});
    },

    parseCookies(options) {
        const {
            secret,
            decode = decodeURIComponent,
        } = options;

        const secrets = Array.isArray(secret) ? secret : (
            R.is(String, secret) ? [secret] : null
        );

        const parsed = cookieparser(this.headers.cookie || '', {decode});
        const cookies = secrets == null ? parsed : Object.keys(parsed).reduce((res, value, key) => {
            let realKey = secrets.reduce((_key, secret) => _key || unsign(key, secret), false);
            return realKey == false ? res : R.assoc(realKey, value, {});
        }, {});

        return this.update({
            cookies: R.merge(this.cookies, cookies),
        });
    },

    withData(key, value) {
        return this.update({
            data: Object.assign({}, this.data, {
                [key]: value,
            }),
        });
    },


});

Object.defineProperty(Request.prototype, 'bodyRead', {
    get: function() { return Boolean(this.original._body); },
    set: function(value) { this.original._body = value; },
});

module.exports = Request;
