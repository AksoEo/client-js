/**
 * A common client interface used by AppClient and UserClient
 */
class ClientInterface {
	req () {} // Must be implemented by class

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
