import crossFetch, { Headers } from 'cross-fetch';
import msgpack from 'msgpack-lite';
import FormData from 'form-data';

import ClientInterface from './client-interface';
import { msgpackCodec } from './util2';

let fetch;
if (typeof window === 'undefined') { // we only need fetch-cookie on nodejs
	fetch = require('fetch-cookie')(crossFetch);
} else {
	fetch = crossFetch;
}

/**
 * A client using no authentication to communicate with the AKSO API
 */
class Client extends ClientInterface {
	/**
	 * @param {Object} options
	 * @param {Object} [options.host]      The host address of the AKSO API
	 * @param {string} [options.userAgent] The user agent string (ignored in the browser)
	 */
	constructor ({
		host = 'http://localhost:1111',
		userAgent = `AKSOClientJS/${require('../package.json').version} (+https://github.com/AksoEo/client-js)`
	} = {}) {
		super();

		this.host = host;
		this.userAgent = userAgent;
	}

	/**
	 * @internal
	 * Performs an HTTP request to the AKSO API
	 * @param  {Object}   options
	 * @param  {string}   options.method        The HTTP method (verb)
	 * @param  {string}   options.path          The HTTP path (resource)
	 * @param  {string}   [options.query]       The query to pass to the query string
	 * @param  {any}      [options.body]        The body to send in the request or `null`. If `contentType` is `application/vnd.msgpack` or `application/json` it's automatically encoded
	 * @param  {Object[]} [options.files]       The files to send in a multipart request, keys:
	 *                                          name, type, value
	 * @param  {boolean}  [options.throwErrors] Whether to throw errors when the status isn't 2xx
	 * @param  {string}   [options.contentType] The content type of the body, if present
	 * @param  {string}   [options.acceptMime]  The expected mime type of the response body
	 * @param  {Headers}  [options.headers]     Headers to pass to the request
	 * @param  {string}   [options.credentials] The Request.credentials setting
	 * @return {Object}
	 */
	async req ({
		method,
		path,
		query = {},
		body = null,
		files = [],
		throwErrors = true,
		contentType = 'application/vnd.msgpack',
		acceptMime = 'application/vnd.msgpack',
		headers = new Headers(),
		credentials = 'omit'
	} = {}) {
		if (!query) { query = {}; }
		const url = this.createURL(path, query);

		headers.append('Accept', acceptMime);

		if (typeof window === 'undefined') { // Only if running on node.js
			headers.set('User-Agent', this.userAgent);
		}

		const fetchOptions = {
			method: method,
			headers: headers,
			redirect: 'follow',
			credentials: credentials
		};

		if (body) {
			fetchOptions.headers.set('Content-Type', contentType);
			if (contentType === 'application/vnd.msgpack') {
				fetchOptions.body = msgpack.encode(body, msgpackCodec);
			} else if (contentType === 'application/json') {
				fetchOptions.body = JSON.stringify(body);
			} else {
				fetchOptions.body = body;
			}
		}

		if (files.length) {
			if (fetchOptions.body) {
				files.unshift({
					name: 'req',
					value: Buffer.from(fetchOptions.body),
					type: fetchOptions.headers.get('Content-Type')
				});
			}

			fetchOptions.headers.delete('Content-Type');
			fetchOptions.body = new FormData();
			for (let file of files) {
				fetchOptions.body.append(file.name, file.value, {
					contentType: file.type,
					filename: file.name // this property must be present to tell the server it's a file not a field
				});
			}
		}

		const res = await fetch(url, fetchOptions);

		const resObj = {
			res: res,
			ok: res.ok,
			resTime: res.headers.get('x-response-time'),
			bodyOk: false,
			body: null,
			contentType: null
		};

		// Parse the body
		const resContentType = resObj.contentType = res.headers.get('Content-Type');
		if (!resContentType) {
			resObj.body = await res.arrayBuffer();

		} else if (resContentType.includes('text/plain')) {
			if (acceptMime.includes('text/plain')) { resObj.bodyOk = true; }
			resObj.body = await res.text();

		} else if (resContentType.includes('application/vnd.msgpack')) {
			if (acceptMime.includes('application/vnd.msgpack')) { resObj.bodyOk = true; }
			resObj.body = msgpack.decode(Buffer.from(await res.arrayBuffer()), msgpackCodec);

		} else if (resContentType.includes('application/json')) {
			if (acceptMime.includes('application/json')) { resObj.bodyOk = true; }
			resObj.body = await res.json();

		} else {
			if (acceptMime === resContentType) { resObj.bodyOk = true; }
			resObj.body = await res.arrayBuffer();
		}

		if (throwErrors && !res.ok) {
			let actualMethod = method;
			if (headers.has('X-Http-Method-Override')) {
				actualMethod = headers.get('X-Http-Method-Override') + ' (using method override)';
			}
			let msg = `Failed at ${actualMethod} ${path} (status ${res.status}`;
			if (resContentType.includes('text/plain')) {
				msg += `: "${resObj.body}"`;
			}
			msg += ')';
			const error = new Error(msg);
			error.statusCode = res.status;
			error.response = res;
			throw error;
		}

		return resObj;
	}
}

export default Client;
