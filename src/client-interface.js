import Url from 'url';
import { Headers } from 'cross-fetch';
import { base64url } from 'rfc4648';
import { promisify } from 'util';
const csvStringify = promisify(require('csv-stringify'));

import { containsBuffer } from './util';

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
	 * Makes a GET request to a collection or resource
	 * @param  {string}  path        The endpoint to request
	 * @param  {Object}  [query]     The query to pass to the query string. All keys are passed as is except:
	 *                               `order` will be csv-ified if it's an array:
	 *                                   [ [ 'id', 'asc' ], 'name.desc' ] -> 'id.asc,name.desc'
	 *                               `fields` will be csv-ified if it's an array:
	 *                                   [ 'id', 'name' ] -> 'id,name'
	 *                               `search` will be csv-ified if it's an object:
	 *                                   { str: "john smith", cols: [ 'firstName', 'lastName' ] } -> '"john smith",firstName,lastName'
	 * @param  {boolean} [returnRes] Whether to return the full response object instead of just the body. Defaults to false.
	 * @return {any} The body of the response, or the response object if `returnRes` is true.
	 */
	async get (path, query = {}, returnRes = false) {
		const encodedQuery = {};
		for (let [key, val] of Object.entries(query)) {
			if (key === 'order') {
				if (Array.isArray(val)) {
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
				method: 'GET',
				path: path,
				query: queryForString
			});
		} else {
			res = await this.req({
				method: 'POST',
				path: path,
				headers: new Headers({
					'X-Http-Method-Override': 'GET'
				}),
				body: encodedQuery
			});
		}

		if (returnRes) { return res; }
		else { return res.body; }
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
}

export default ClientInterface;
