import { Headers } from 'cross-fetch';

import ClientInterface from './client-interface';
import Client from './client';

/**
 * A client using app authentication to communicate with the AKSO API
 */
class UserClient extends ClientInterface {
	/**
	 * @param {Object} options
	 * @param {Object}    [options.host] The host address of the AKSO API
	 * @param {string}    [options.userAgent] The user agent string (ignored in the browser)
	 * @param {CookieJar} [options.cookieJar] A cookie jar for fetch-cookie (ignored in the browser)
	 * @param {Object}    [options.headers]   Additional headers to add to every request
	 */
	constructor ({
		host,
		userAgent,
		cookieJar,
		headers
	} = {}) {
		super();

		this.client = new Client({
			host,
			userAgent,
			cookieJar,
			headers
		});
		this.loggedIn = false;
		this.totpRequired = null;
		this.csrfToken = null;
	}

	/**
	 * Logs in as a user
	 * @param  {string} login    The user's old or new UEA code or their email address
	 * @param  {string} password The user's password
	 * @return {Object}          The response from `GET /auth`
	 */
	async logIn (login, password) {
		await this.req({
			method: 'PUT',
			path: '/auth',
			body: {
				login: login,
				password: password
			},
			_allowLoggedOut: true
		});

		const resAuthCheck = await this.restoreSession();
		if (!resAuthCheck) { throw new Error('GET /auth returns 404 after a successful call to PUT /auth'); }

		return resAuthCheck;
	}

	/**
	 * Restores an existing session
	 * @return {Object|boolean} False if there's no session to restore, otherwise the response from GET /auth
	 */
	async restoreSession () {
		try {
			const resAuthCheck = await this.req({
				method: 'GET',
				path: '/auth',
				_allowLoggedOut: true
			});
			this.loggedIn = true;
			this.totpRequired = resAuthCheck.body.isAdmin || resAuthCheck.body.totpSetUp;
			this.csrfToken = resAuthCheck.body.csrfToken;
			return resAuthCheck.body;
		} catch (err) {
			if (err.statusCode === 404) { return false; }
			throw err;
		}
	}

	/**
	 * Logs out
	 */
	async logOut () {
		await this.req({
			method: 'DELETE',
			path: '/auth'
		});
		this.loggedIn = false;
	}

	/**
	 * Sets up totp and logs in using it. The TOTP client must be instructed to set the period to 30 seconds
	 * @param {Buffer}  secret     20 random bytes used as the TOTP secret
	 * @param {string}  totp       A 6 character TOTP code
	 * @param {boolean} [remember] Whether to remember this device for 60 days
	 */
	async totpSetup (secret, totp, remember = false) {
		await this.req({
			method: 'POST',
			path: '/auth/totp',
			body: {
				secret: secret,
				totp: totp,
				remember: remember
			}
		});
	}

	/**
	 * Logs in using TOTP
	 * @param {string} totp        A 6 character TOTP code
	 * @param {boolean} [remember] Whether to remember this device for 60 days
	 */
	async totpLogIn (totp, remember = false) {
		await this.req({
			method: 'POST',
			path: '/auth/totp',
			body: {
				totp: totp,
				remember: remember
			}
		});
	}

	/**
	 * Disables TOTP
	 */
	async totpRemove () {
		await this.req({
			method: 'DELETE',
			path: '/auth/totp'
		});
	}

	/**
	 * @internal
	 * Makes a request to the AKSO API
	 */
	req (options) {
		if (!this.loggedIn && !options._allowLoggedOut) { throw new Error('Call UserClient#logIn to log in first'); }

		options.credentials = 'include';

		if (!options.headers) { options.headers = new Headers(); }
		if (this.loggedIn) {
			options.headers.set('X-CSRF-Token', this.csrfToken);
		}

		return this.client.req(options);
	}
}

export default UserClient;
