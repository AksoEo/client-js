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
		await this.client.req({
			method: 'PUT',
			path: '/auth',
			body: {
				login: login,
				password: password
			}
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
		await this.client.req({
			method: 'DELETE',
			path: '/auth'
		});
		this.loggedIn = false;
	}

	/**
	 * @internal
	 * Makes a request to the AKSO API
	 */
	req (options) {
		if (!this.loggedIn) { throw new Error('Call UserClient#logIn to log in first'); }

		options.credentials = 'include';
		return this.client.req(options);
	}
}

export default UserClient;
