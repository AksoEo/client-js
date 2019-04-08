import { Headers } from 'cross-fetch';

import ClientInterface from './client-interface';
import Client from './client';

/**
 * A client using app authentication to communicate with the AKSO API
 */
class AppClient extends ClientInterface {
	/**
	 * @param {Object} options
	 * @param {string} options.apiKey      The hex encoded api key
	 * @param {string} options.apiSecret   The hex encoded api secret
	 * @param {Object} [options.host]	   The host address of the AKSO API
	 * @param {string} [options.userAgent] The user agent string (ignored in the browser)
	 */
	constructor ({
		apiKey,
		apiSecret,
		host,
		userAgent
	} = {}) {
		super();

		this.apiKey = apiKey;
		this.apiSecret = apiSecret;
		this.client = new Client({
			host: host,
			userAgent: userAgent
		});
	}

	/**
	 * @internal
	 * Makes a request to the AKSO API
	 */
	req (options) {
		if (!options.headers) { options.headers = new Headers(); }
		options.headers.set('Authorization', `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`);

		return this.client.req(options);
	}
}

export default AppClient;
