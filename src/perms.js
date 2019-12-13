/**
 * Parses permissions into a tree.
 */
export default class Perms {
	constructor () {
		this.perms = null;
		this.permsTree = null;
	}

	/**
	 * Whether or not a permissions object has been loaded.
	 *
	 * @type {boolean}
	 */
	get loaded () {
		return this.perms !== null;
	}

	/**
	 * Loads a permissions object.
	 *
	 * @param {Object}  perms The permissions object
	 */
	load (perms) {
		this.perms = perms;

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
	}

	/**
	 * Checks whether the client has a certain permission.
	 * Returns null if permissions haven’t been loaded yet.
	 *
	 * @param  {string}  perm The permission to check
	 * @return {boolean|null}
	 */
	hasPerm (perm) {
		if (!this.permsTree) return null;

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
	 * Checks whether the client has several permissions.
	 * Returns null if permissions haven’t been loaded yet.
	 *
	 * @param  {...string} perms The permissions to check
	 * @return {boolean|null}
	 */
	hasPerms (...perms) {
		return perms.map(p => this.hasPerm(p)).reduce((a, b) => a === null ? null : a && b, false);
	}

	/**
	 * Returns whether the client has access to a codeholder field.
	 * Returns null if permissions haven’t been loaded yet.

	 * @param  {string}  field  The field to check for
	 * @param  {string}  flags  The required flags on the field
	 * @param  {string}  [prop] @internal The property of this.perms to check for the fields in
	 * @return {boolean|null}
	 */
	hasCodeholderField (field, flags, prop = 'memberFields') {
		const { perms } = this;
		const arr = perms[prop];
		if (arr === null) { return true; }
		if (!(field in arr)) { return false; }
		return flags
			.split('')
			.map(fl => arr[field].includes(fl))
			.reduce((a, b) => a && b, true);
	}

	/**
	 * Returns whether the client has access to a own codeholder field.
	 * Returns null if permissions haven’t been loaded yet.
	 *
	 * @param  {string}  field  The field to check for
	 * @param  {string}  flags  The required flags on the field
	 * @return {boolean|null}
	 */
	hasOwnCodeholderField (field, flags) {
		return this.hasCodeholderField(field, flags, 'ownMemberFields');
	}

	/**
	 * Returns whether the client has access to several codeholder fields.
	 * Returns null if permissions haven’t been loaded yet.
	 *
	 * @param  {string}    flags  The required flags on the field
	 * @param  {...string} fields The fields to check for
	 * @return {boolean|null}
	 */
	hasCodeholderFields (flags, ...fields) {
		return fields.map(f => this.hasCodeholderField(f, flags))
			.reduce((a, b) => a === null ? null : a && b, false);
	}

	/**
	 * Returns whether the client has access to several own codeholder fields
	 * Returns null if permissions haven’t been loaded yet.
	 *
	 * @param  {string}    flags  The required flags on the field
	 * @param  {...string} fields The fields to check for
	 * @return {boolean|null}
	 */
	hasOwnCodeholderFields (flags, ...fields) {
		return fields.map(f => this.hasCodeholderField(f, flags, 'ownMemberFields'))
			.reduce((a, b) => a === null ? null : a && b, false);
	}
}
