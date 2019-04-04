import Client from './client';

/**
 * A client using app authentication to communicate with the AKSO API
 */
class UserClient {
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

	async logOut () {
		await this.client.req({
			method: 'DELETE',
			path: '/auth'
		});
		this.loggedIn = false;
	}

	req (options) {
		if (!this.loggedIn) { throw new Error('Call UserClient#logIn to log in first'); }

		options.credentials = 'include';
		return this.client.req(options);
	}
}

export default UserClient;
