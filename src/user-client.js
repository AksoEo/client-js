import Client from './client';

/**
 * A client using app authentication to communicate with the AKSO API
 */
class UserClient {
	/**
	 * @param {Object} options
	 * @param {Object} [options.host] The host address of the AKSO API
	 */
	constructor ({
		host
	} = {}) {
		this.client = new Client({
			host: host
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

		const resAuthCheck = await this.client.req({
			method: 'GET',
			path: '/auth'
		});

		this.loggedIn = true;
		this.totpRequired = resAuthCheck.body.isAdmin || resAuthCheck.body.totpSetUp;
		this.csrfToken = resAuthCheck.body.csrfToken;
		return resAuthCheck.body;
	}

	/**
	 * Logs out
	 */
	async logOut () {
		await this.req({
			method: 'DELETE',
			path: '/auth',
			_allowLoggedOut: true
		});
		this.loggedIn = false;
	}

	/**
	 * Sets up totp and logs in using it. The TOTP client must be instructed to set the period to 30 seconds
	 * @param  {Buffer} secret 20 random bytes used as the TOTP secret
	 * @param  {string} totp   A 6 character TOTP code
	 */
	async totpSetup (secret, totp) {
		await this.req({
			method: 'POST',
			path: '/auth/totp',
			body: {
				secret: secret,
				totp: totp
			}
		});
	}

	/**
	 * Logs in using TOTP
	 * @param  {string} totp A 6 character TOTP code
	 */
	async totpLogIn (totp) {
		await this.req({
			method: 'POST',
			path: '/auth/totp',
			body: {
				totp: totp
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
		return this.client.req(options);
	}
}

export default UserClient;
