const oldCodeRegex = /^([a-z]{4})(?:-([a-z]))?$/;
const newCodeRegex = /^[a-z]{6}$/;

/**
 * The UEA Code of a codeholder
 */
class UEACode {
	/**
	 * @param {string} code The UEA code
	 */
	constructor (code) {
		if (!UEACode.validate(code)) {
			const err = new Error('Invalid UEA code supplied');
			err.err = 'invalid-uea-code';
			throw err;
		}

		if (code.length === 4) {
			this.type = 'old';

			const oldCode = oldCodeRegex.exec(code);
			this.code = oldCode[1];
		} else {
			this.type = 'new';
			this.code = code;
		}
	}

	/**
	 * Formats the UEA code for display
	 * 
	 * @return {string}
	 */
	toString () {
		if (this.type === 'old') {
			return `${this.code}-${this.getCheckLetter()}`;
		}

		return this.code;
	}

	/**
	 * Gets the check letter for the code. This only works for old UEA codes
	 * 
	 * @return {string} The check letter
	 */
	getCheckLetter () {
		if (this.type !== 'old') {
			const err = new Error('Check letters only exist for old UEA codes');
			err.err = 'no-check-letter';
			throw err;
		}

		return UEACode.getCheckLetter(this.code);
	}

	/**
	 * Checks whether a given UEA code is syntactically valid. This does not check whether it exists.
	 * 
	 * @param  {string} code The UEA code to validate
	 * @return {boolean} Whether the code is valid
	 */
	static validate (code) {
		if (typeof code !== 'string') {
			return false;
		}

		code = code.toLowerCase(); // normalize the code

		// Check if it's a valid new code
		const oldCode = oldCodeRegex.exec(code);
		if (oldCode) {
			if (oldCode[2]) { // Has check letter
				return oldCode[2] === UEACode.getCheckLetter(oldCode[1]);
			}

			return true;
		}

		// Check if it's a valid new code
		return newCodeRegex.test(code);
	}

	/**
	 * Calculates the check letter for an old four-letter UEA code
	 *
	 * Algorithm: https://eo.wikipedia.org/wiki/Kontrolcifero#UEA-kodo
	 * 
	 * @param  {string} The four letter old UEA code
	 * @return {string} The check letter
	 */
	static getCheckLetter (code) {
		const letters = code
			.toLowerCase()
			.split('')
			.map(l => l.charCodeAt(0) - 96);

		const letterSum = letters
			.map((l, i) => l * (i + 2))
			.reduce((a, b) => a + b);

		const checkValue = 26 - (letterSum % 26);
		const checkLetter = String.fromCharCode(checkValue + 96);

		return checkLetter;
	}
}

export default UEACode;
