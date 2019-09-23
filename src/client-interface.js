import Url from 'url';
import { Headers } from 'cross-fetch';
import { base64url } from 'rfc4648';
import { promisify } from 'util';
import nudeCsvStringify from 'csv-stringify';
const csvStringify = promisify(nudeCsvStringify);

import { containsBuffer } from './util2';

/**
 * A common client interface used by AppClient and UserClient
 */
class ClientInterface {
	req () {} // Must be implemented by class

	/**
	 * @internal Generates a URL for a query
	 * @param  {string} path  The path
	 * @param  {string} query The query string
	 * @return {URL}
	 */
	createURL (path, query) {
		const url = new URL(this.host);
		url.pathname = Url.resolve(url.pathname, path);
		url.search = new URLSearchParams(query);

		return url;
	}

	/**
	 * Encodes the query, handles method overriding, and runs req.
	 * @param {string} method   The HTTP method.
	 * @param {string} path     The request endpoint.
	 * @param {Object} query    The query. All keys are passed as-is except:
	 *                               `order` will be csv-ified if it's an array:
	 *                                   [ [ 'id', 'asc' ], 'name.desc' ] -> 'id.asc,name.desc'
	 *                               `fields` will be csv-ified if it's an array:
	 *                                   [ 'id', 'name' ] -> 'id,name'
	 *                               `search` will be csv-ified if it's an object:
	 *                                   { str: "john smith", cols: [ 'firstName', 'lastName' ] } -> '"john smith",firstName,lastName'
	 *                               `filter` will be encoded using base64url or make a switch to method overriding as necessary
	 * @param {Object} extra    Extra properties in the request, will be passed as-is.
	 * @return {Object} The response.
	 */
	async encodeQueryAndReq (method, path, query, extra = {}) {
		const encodedQuery = {};
		for (let [key, val] of Object.entries(query)) {
			if (typeof val === 'undefined') { continue; }

			if (key === 'order') {
				if (Array.isArray(val)) {
					if (!val.length) { continue; }

					val = val
						.map(x => Array.isArray(x) ? x.join('.') : x)
						.join(',');
				}

			} else if (key === 'fields') {
				if (Array.isArray(val)) {
					val = val.join(',');
				}

			} else if (key === 'search') {
				if (typeof val === 'object' && val !== null && !Array.isArray(val) && 'str' in val && 'cols' in val) {
					const search = (await csvStringify([[val.str]])).slice(0, -1);
					const cols = val.cols;
					val = [ search, ...cols ].join(',');
				}

			}

			encodedQuery[key] = val;
		}

		// Perform method override if the url exceeds 2k characters or if it contains a buffer somewhere
		const hasBuffer = containsBuffer(encodedQuery);
		const queryForString = {};
		if (!hasBuffer) {
			for (let [key, val] of Object.entries(encodedQuery)) {
				if (typeof val === 'object' && val !== null) {
					val = JSON.stringify(val); // todo: handle buffers
				}

				if (key === 'filter') {
					val = base64url.stringify(Buffer.from(val), { pad: false });
				}
				queryForString[key] = val;
			}
		}

		const url = this.client.createURL(path, queryForString);
		let res;
		if (!hasBuffer && url.toString().length < 2000) {
			res = await this.req({
				method,
				path,
				query: queryForString,
				...extra
			});
		} else {
			// can’t have two bodies, so throw an error
			if ('body' in extra) throw new Error(`${method} does not support URL queries this long`);
			res = await this.req({
				method: 'POST',
				path,
				headers: new Headers({
					'X-Http-Method-Override': method
				}),
				...extra,
				body: encodedQuery
			});
		}

		return res;
	}

	/**
	 * Makes a GET request to a collection or resource
	 * @param  {string}  path        The endpoint to request
	 * @param  {Object}  [query]     The query to pass to the query string.
	 *								 See encodeQuery for more information.
	 * @return {Object} The response
	 */
	get (path, query = {}) {
		return this.encodeQueryAndReq('GET', path, query);
	}

	/**
	 * Obtains a collection or resource as csv.
	 * This method does not account for rate limiting, so care should be taken.
	 * This method also does not account for memory usage, meaning that ridiculously large collections will inevitably result in a memory issue. To circumvent this, one may set the `limit` option in the `query` object and call this method several times.
	 * @param  {string} path               The endpoint to request
	 * @param  {Object} [query]            The query to make
	 * @param  {Object} [stringifyOptions] Options to pass to csv-stringify, e.g. `header` and `columns`
	 * @return {string}                    The csv file
	 */
	async getCsv (path, query = {}, stringifyOptions = {}) {
		query = {...query}; // make a copy

		const stringifier = nudeCsvStringify(stringifyOptions);
		let csvData = [];
		stringifier.on('readable', () => {
			let row;
			while (row = stringifier.read()) { csvData.push(row); }
		});
		stringifier.on('error', err => { throw err; });
		const ready = new Promise(resolve => {
			stringifier.on('finish', () => resolve());
		});

		let rows = 0;
		const makeReq = async offset => {
			if (offset !== null) { query.offset = offset; }
			const chunkRes = await this.get(path, query);
			const body = chunkRes.body;
			if (Array.isArray(body)) {
				if (!chunkRes.body.length) { return; }
				chunkRes.body.forEach(row => stringifier.write(row));
				rows += chunkRes.body.length;
				if (rows < chunkRes.res.headers.get('x-total-items')) {
					await makeReq(offset + chunkRes.body.length);
				}
			} else {
				stringifier.write(chunkRes.body);
			}
		};
		await makeReq(null);

		stringifier.end();
		await ready;
		return csvData.join('');
	}

	/**
	 * Makes a delete request
	 * @param  {string} path
	 * @param  {Object} [query]
	 * @return {Object} The response
	 */
	delete (path, query = {}) {
		return this.encodeQueryAndReq('DELETE', path, query);
	}

	/**
	 * Makes a post request
	 * @param  {string} path
	 * @param  {Object} [body]
	 * @param  {Object} [query]
	 * @param  {Object} [files]
	 * @return {Object} The response
	 */
	post (path, body = null, query = {}, files = []) {
		return this.encodeQueryAndReq('POST', path, query, { body, files });
	}

	/**
	 * Makes a put request
	 * @param  {string} path
	 * @param  {Object} [body]
	 * @param  {Object} [query]
	 * @param  {Object} [files]
	 * @return {Object} The response
	 */
	put (path, body = null, query = {}, files = []) {
		return this.encodeQueryAndReq('PUT', path, query, { body, files });
	}

	/**
	 * Makes a patch request
	 * @param  {string} path
	 * @param  {Object} [body]
	 * @param  {Object} [query]
	 * @return {Object} The response
	 */
	patch (path, body = null, query = {}) {
		return this.encodeQueryAndReq('PATCH', path, query, { body, files });
	}

	/**
	 * Refreshes the stored permissions
	 * @return {Object} The permissions (see `GET /perms``)
	 */
	async refreshPerms () {
		const res = await this.req({
			method: 'GET',
			path: '/perms'
		});
		this.perms = res.body;

		this.permsTree = {};
		for (let perm of this.perms.permissions) {
			let path = this.permsTree;
			const bits = perm.split('.');
			for (let i = 0; i < bits.length; i++) {
				const bit = bits[i];
				const isLast = i+1 === bits.length;

				if (isLast) {
					path[bit] = true;
				} else {
					if (!(bit in path)) { path[bit] = {}; }
					path = path[bit];
				}
			}
		}

		return this.perms;
	}

	/**
	 * Gets the client's permissions
	 * @return {Object} The permissions (see `GET /perms`)
	 */
	async getPerms () {
		if (!this.perms) { await this.refreshPerms(); }
		return this.perms;
	}

	/**
	 * Checks whether the client has a certain permission
	 * @param  {string}  perm The permission to check
	 * @return {boolean}
	 */
	async hasPerm (perm) {
		if (!this.permsTree) { await this.refreshPerms(); }

		let path = this.permsTree;
		const bits = perm.split('.');
		for (let bit of bits) {
			if ('*' in path) { return true; }
			if (!(bit in path)) { return false; }
			path = path[bit];
		}
		return true;
	}

	/**
	 * Checks whether the client has several permissions
	 * @param  {...string} perms The permissions to check
	 * @return {boolean}
	 */
	async hasPerms (...perms) {
		return (await Promise.all(perms.map(p => this.hasPerm(p))))
			.reduce((a, b) => a && b);
	}

	/**
	 * Returns whether the client has access to a codeholder field
	 * @param  {string}  field  The field to check for
	 * @param  {string}  flags  The required flags on the field
	 * @param  {string}  [prop] @internal The property of this.perms to check for the fields in
	 * @return {boolean}
	 */
	async hasCodeholderField (field, flags, prop = 'memberFields') {
		const perms = await this.getPerms();
		const arr = perms[prop];
		if (arr === null) { return true; }
		if (!(field in arr)) { return false; }
		return flags
			.split('')
			.map(fl => arr[field].includes(fl))
			.reduce((a, b) => a && b, true);
	}

	/**
	 * Returns whether the client has access to a own codeholder field
	 * @param  {string}  field  The field to check for
	 * @param  {string}  flags  The required flags on the field
	 * @return {boolean}
	 */
	hasOwnCodeholderField (field, flags) {
		return this.hasCodeholderField(field, flags, 'ownMemberFields');
	}

	/**
	 * Returns whether the client has access to several codeholder fields
	 * @param  {string}    flags  The required flags on the field
	 * @param  {...string} fields The fields to check for
	 * @return {boolean}
	 */
	async hasCodeholderFields (flags, ...fields) {
		return (await Promise.all(fields.map(f => this.hasCodeholderField(f, flags))))
			.reduce((a, b) => a && b);
	}

	/**
	 * Returns whether the client has access to several own codeholder fields
	 * @param  {string}    flags  The required flags on the field
	 * @param  {...string} fields The fields to check for
	 * @return {boolean}
	 */
	async hasOwnCodeholderFields (flags, ...fields) {
		return (await Promise.all(fields.map(f => this.hasCodeholderField(f, flags, 'ownMemberFields'))))
			.reduce((a, b) => a && b);
	}
}

export default ClientInterface;
