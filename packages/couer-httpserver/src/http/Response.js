const R = require('ramda');
const mime = require('mime');
const sign = require('cookie-signature').sign;
const serialize = require('cookie').serialize;
const encodeurl = require('encodeurl');
const mergeDescriptors = require('merge-descriptors');
const Future = require('fluture');

const debug = require('debug')('couer:Response');

const setCharset = require('../util/setCharset');
const createHttpError = require('../errors/createHttpError');

const send = require('send');

function Response(
    original,
    headers,
    statusCode,
    statusMessage,
    body,
    data,
    cookies
) {

    return {
        get original() { return original; },
        get headers() { return headers; },
        get statusCode() { return statusCode; },
        get statusMessage() { return statusMessage; },
        get body() { return body; },
        get data() { return data; },
        get cookies() { return cookies; },
        __proto__: Response.prototype,
    };
}

Response.fromNodeResponse = function fromNodeResponse(noderes) {
    return Response(
        noderes,
        noderes.headers || {},
        noderes.statusCode || 200,
        noderes.statusMessage || undefined,
        Buffer.from([]),
        noderes.locals || {},
        {}
    );
};

mergeDescriptors(Response.prototype, {
    update(updates) {
        const {
            original = this.original,
            headers = this.headers,
            statusCode = this.statusCode,
            statusMessage = this.statusMessage,
            body = this.body,
            data = this.data,
            cookies = this.cookies,
        } = updates;

        return Response(
            original,
            headers,
            statusCode,
            statusMessage,
            body,
            data,
            cookies
        );
    },

    status(statusCode) {
        return this.update({
            statusCode,
        });
    },

    message(statusMessage) {
        return this.update({
            statusMessage,
        });
    },

    addHeaders(values) {
        return this.update({
            headers: Object.assign({}, this.headers, values),
        });
    },

    header(name, val) {
        if (typeof val === 'undefined') {
            return this.removeHeader(name);
        }

        return this.update({
            headers: R.assoc(name, val, this.headers),
        });
    },

    appendHeader(name, val) {
        const current = this.headers[name];
        if (typeof current === 'undefined') {
            return this.header(name, [val]);
        }

        const newVal = Array.isArray(current)
            ? [...current, val]
            : [current, val]
        ;

        return this.header(name, newVal);
    },

    removeHeader(name) {
        return this.update({
            headers: R.dissoc(name, this.headers),
        });
    },

    type(type) {
        return this.header(
            'Content-Type',
            type.indexof('/') === -1 ? mime.getType(type) : type
        );
    },

    send(body) {
        if (!(body instanceof Buffer)) {
            body = Buffer.from(body);
        }

        return this.update({
            body,
            headers: R.assoc('Content-Length', body.length, this.headers),
        });
    },

    stream(stream) {
        return this.update({
            body: stream,
        });
    },

    json(obj, replacer = undefined, space = undefined) {
        const body = Buffer.from(JSON.stringify(obj, replacer, space), 'utf-8');
        const type = this.headers['Content-Type'] || 'application/json';
        return this.header('Content-Type', setCharset(type, 'utf-8')).send(body);
    },

    text(text) {
        const body = Buffer.from(text, 'utf-8');
        const type = this.headers['Content-Type'] || 'text/plain';
        return this.header('Content-Type', setCharset(type, 'utf-8')).send(body);
    },

    html(html) {
        const body = Buffer.from(html, 'utf-8');
        const type = this.headers['Content-Type'] || 'text/html';
        return this.header('Content-Type', setCharset(type, 'utf-8')).send(body);
    },

    binary(buffer) {
        const type = this.headers['Content-Type'] || mime.getType('bin');
        return this.header('Content-Type', type).send(buffer);
    },

    file(req, path, options = {}) {
        const stream = send(req, path, options);
        return this.stream(stream);
    },

    format(req, data, formatters) {
        const types = Object.keys(formatters);
        const type = types.length ? req.acceptType(types) : formatters.default;

        if (type) {
            // TODO: vary
            return formatters[type](req, this, data);
        }

        return Future.reject(createHttpError(406, 'Not Acceptable'));
    },

    cookie(name, value, options = {}) {
        const {
            secret = null,
            encode = encodeURIComponent,
        } = options;

        if (R.is(Number, options.maxAge)) {
            if (!R.is(Date, options.expires)) {
                options = R.dissoc(
                    'maxAge',
                    R.assoc('expires', new Date(Date.now() + options.maxAge), options)
                );
            } else {
                options = R.assoc('maxAge', Math.floor(options.maxAge / 1000));
            }
        }

        const serializeOptions = R.merge({
            path: '/',
            httpOnly: true,
            secure: false,
        }, options);

        const useSecret = Array.isArray(secret) ? secret[0] : secret;
        const useName = useSecret && R.is(String, useSecret) ? sign(name, useSecret) : name;
        const useValue = encode(value);

        const cookie = serialize(useName, useValue, serializeOptions);

        return this.update({
            cookies: Object.assign({}, this.cookies, {[name]: cookie}),
        });
    },

    writeCookies() {
        return Object.keys(this.cookies).reduce((self, cookieName) => {
            return this.appendHeader('Set-Cookie', this.cookies[cookieName]);
        }, this);
    },

    clearCookie(name, options = {}) {
        return this.cookie(
            name,
            '',
            R.merge({expires: new Date(1), path: '/'}, options)
        );
    },

    location(url) {
        return this.header('Location', encodeurl(url));
    },

    redirect(url, statusCode = 302) {
        return this.status(statusCode).send(Buffer.from([])).location(url);
    },

    links(links) {
        const link = this.headers['Link'] || '';
        const newLink = Object.keys(links).map((rel) => {
            return `<${links[rel]}>; rel="${rel}"`;
        }).join(', ');

        const finalLink = link === '' ? newLink : (
            newLink === '' ? link : `${link}, ${newLink}`
        );

        return this.header('Link', finalLink);
    },

    vary(variant) {
        if (!Array.isArray(variant)) {
            variant = [variant];
        }

        const existing = (this.headers['Vary'] || '').split(',').map((s) => s.trim()).filter(Boolean);

        if (existing.indexOf('*') > -1 || variant.indexOf('*') > -1) {
            return this.header('Vary', '*');
        } else if (existing.length === 0) {
            return this.header('Vary', variant.join(', '));
        } else {
            return this.header('Vary', Array.from(new Set(existing.concat(variant))).join(', '));
        }
    },

    on(event, action) {
        const newData = Object.assign({}, this.data, {
            __on: Object.assign({}, this.data.__on || {}, {
                [event]: ((this.data.__on && this.data.__on[event]) || []).concat([action]),
            }),
        });

        return this.update({data: newData});
    },

    onHeader(action) {
        return this.on('header', action);
    },

    onBody(action) {
        return this.on('body', action);
    },
});

module.exports = Response;
