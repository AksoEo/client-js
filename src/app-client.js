import { Headers } from 'cross-fetch';
import Client from './client';

/**
 * A client using app authentication to communicate with the AKSO API
 */
class AppClient {
	constructor ({
		apiKey,
		apiSecret,
		host
	} = {}) {
		this.apiKey = apiKey;
		this.apiSecret = apiSecret;
		this.client = new Client({
			host: host
		});
	}

	req (options) {
		if (!options.headers) { options.headers = new Headers(); }
		options.headers.set('Authorization', `Basic ${Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64')}`);

		return this.client.req(options);
	}
}

export default AppClient;
