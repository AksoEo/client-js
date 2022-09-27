import Url from 'url';
import { Headers } from './fetch.*.js';
import { base64url } from 'rfc4648';

import { byteArraysToBuffers, containsBuffer } from './util2.js';
import Perms from './perms.js';

/**
 * A common client interface used by AppClient and UserClient
 */
class ClientInterface {
	constructor () {
		this.perms = new Perms();
	}

	req () {} // Must be implemented by class

	/**
	 * @internal Generates a URL for a query.
	 *
	 * Note that even absolute paths with a leading / will be resolved relative to the host URL.
	 *
	 * @param  {string} path  The path
	 * @param  {string} query The query string
	 * @return {URL}
	 */
	createURL (path, query) {
		const url = new URL(this.host);
		if (path.startsWith('/')) path = path.substr(1); // ignore leading / to force relative paths
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
					// we need to escape the search string like a CSV field
					let search = (val.str || '').toString();
					if (search.match(/[,\r\n"]/)) {
						// contains characters that must be escaped
						search = '"' + search.replace(/"/g, '""') + '"';
					}
					const cols = val.cols;
					val = [ search, ...cols ].join(',');
				}

			}

			// msgpack does not support byte arrays (like Uint8Array), so we have to convert them first.
			encodedQuery[key] = byteArraysToBuffers(val);
		}

		// Perform method override if the url exceeds 2k characters or if it contains a buffer somewhere
		const hasBuffer = containsBuffer(encodedQuery);
		const queryForString = {};
		if (!hasBuffer) {
			for (let [key, val] of Object.entries(encodedQuery)) {
				if (typeof val === 'object' && val !== null) {
					val = JSON.stringify(val);
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
		return this.encodeQueryAndReq('PATCH', path, query, { body });
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
		this.perms.load(res.body);

		return this.perms.perms;
	}

	/**
	 * Gets the client's permissions
	 * @return {Object} The permissions (see `GET /perms`)
	 */
	async getPerms () {
		if (!this.perms) { await this.refreshPerms(); }
		return this.perms.perms;
	}

	/**
	 * Checks whether the client has a certain permission.
	 * Returns null if permissions haven’t been loaded yet.
	 *
	 * @param  {string}  perm The permission to check
	 * @return {boolean|null}
	 */
	hasPermSync (perm) {
		return this.perms.hasPerm(perm);
	}

	/**
	 * Checks whether the client has a certain permission
	 * @param  {string}  perm The permission to check
	 * @return {boolean}
	 */
	async hasPerm (perm) {
		if (!this.perms.loaded) { await this.refreshPerms(); }
		return this.perms.hasPerm(perm);
	}

	/**
	 * Checks whether the client has several permissions
	 * @param  {...string} perms The permissions to check
	 * @return {boolean}
	 */
	async hasPerms (...perms) {
		if (!this.perms.loaded) { await this.refreshPerms(); }
		return this.perms.hasPerms(...perms);
	}

	/**
	 * Returns whether the client has access to a codeholder field
	 * @param  {string}  field  The field to check for
	 * @param  {string}  flags  The required flags on the field
	 * @return {boolean}
	 */
	async hasCodeholderField (field, flags) {
		if (!this.perms.loaded) { await this.refreshPerms(); }
		return this.perms.hasCodeholderField(field, flags);
	}

	/**
	 * Returns whether the client has access to a own codeholder field
	 * @param  {string}  field  The field to check for
	 * @param  {string}  flags  The required flags on the field
	 * @return {boolean}
	 */
	async hasOwnCodeholderField (field, flags) {
		if (!this.perms.loaded) { await this.refreshPerms(); }
		return this.perms.hasOwnCodeholderField(field, flags);
	}

	/**
	 * Returns whether the client has access to several codeholder fields
	 * @param  {string}    flags  The required flags on the field
	 * @param  {...string} fields The fields to check for
	 * @return {boolean}
	 */
	async hasCodeholderFields (flags, ...fields) {
		if (!this.perms.loaded) { await this.refreshPerms(); }
		return this.perms.hasCodeholderFields(flags, ...fields);
	}

	/**
	 * Returns whether the client has access to several own codeholder fields
	 * @param  {string}    flags  The required flags on the field
	 * @param  {...string} fields The fields to check for
	 * @return {boolean}
	 */
	async hasOwnCodeholderFields (flags, ...fields) {
		if (!this.perms.loaded) { await this.refreshPerms(); }
		return this.perms.hasOwnCodeholderFields(flags, ...fields);
	}
}

export default ClientInterface;
