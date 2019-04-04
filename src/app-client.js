import fetch, { Headers } from 'cross-fetch';
import msgpack from 'msgpack-lite';

import { msgpackCodec } from '.';

/**
 * A client using app authentication to communicate with the AKSO API
 */
class AppClient {
	constructor ({
		apiKey,
		apiSecret,
		host = 'http://localhost:1111'
	} = {}) {
		this.apiKey = apiKey;
		this.apiSecret = apiSecret;
		this.host = host;
	}

	async req ({
		method,
		path,
		body = null,
		acceptMime = 'application/vnd.msgpack'
	} = {}) {
		const url = new URL(this.host);
		url.pathname = path;

		const fetchOptions = {
			method: method,
			headers: new Headers({
				Accept: acceptMime,
				Authorization: `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`
			}),
			redirect: 'follow'
		};

		if (body) {
			fetchOptions.headers['Content-Type'] = 'application/vnd.msgpack';
			fetchOptions.body = msgpack.encode(body, msgpackCodec);
		}

		const res = await fetch(url, fetchOptions);

		const resObj = {
			res: res,
			ok: res.ok,
			resTime: res.headers.get('x-response-time'),
			bodyOk: false,
			body: null
		};

		// Parse the body
		const resContentType = res.headers.get('Content-Type');
		if (!resContentType) {
			resObj.body = await res.arrayBuffer();

		} else if (resContentType.includes('text/plain')) {
			if (acceptMime.includes('text/plain')) { resObj.bodyOk = true; }
			resObj.body = await res.text();

		} else if (resContentType.includes('application/vnd.msgpack')) {
			if (acceptMime.includes('application/vnd.msgpack')) { resObj.bodyOk = true; }
			resObj.body = msgpack.decode(await res.arrayBuffer(), msgpackCodec);

		} else if (resContentType.includes('application/json')) {
			if (acceptMime.includes('application/json')) { resObj.bodyOk = true; }
			resObj.body = await res.json();

		} else {
			if (acceptMime === resContentType) { resObj.bodyOk = true; }
			resObj.body = await res.arrayBuffer();
		}

		return resObj;
	}
}

export default AppClient;
