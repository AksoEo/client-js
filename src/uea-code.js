const oldCodeRegex = /^([a-z]{4})(?:-([a-z]))?$/;
const newCodeRegex = /^[a-z]{6}$/;

const codeSuggestPatterns = {
	human: [
		// l = last name
		// f = first name
		[ [ 'l', 3 ], [ 'f', 3 ] ],
		[ [ 'l', 4 ], [ 'f', 2 ] ],
		[ [ 'l', 5 ], [ 'f', 1 ] ],
		[ [ 'l', 2 ], [ 'f', 4 ] ],
		[ [ 'l', 1 ], [ 'f', 5 ] ],

		[ [ 'f', 3 ], [ 'l', 3 ] ],
		[ [ 'f', 4 ], [ 'l', 2 ] ],
		[ [ 'f', 5 ], [ 'l', 1 ] ],
		[ [ 'f', 1 ], [ 'l', 5 ] ],
		[ [ 'f', 2 ], [ 'l', 4 ] ],

		[ [ 'f', 6 ] ],
		[ [ 'l', 6 ] ]
	],

	org: [
		// a = abbreviation
		// n = full name
		[ [ 'a', 4 ] ],
		[ 'x', [ 'a', 3 ] ],
		[ [ 'n', 4 ] ],
		[ 'x', [ 'n', 3 ] ],
	]
};

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

	/**
	 * Suggests possible new UEA codes for a codeholder
	 *
	 * Algorithm scratch: https://docs.google.com/document/d/1_q3Z7AC_Aprz7KHKXPjok_qinfpX3P4iyrmhm8QLic0
	 * 
	 * @param  {Object}   options
	 * @param  {string}   options.type         The type of codeholder, either `human` or `org`.
	 * @param  {string[]} [options.firstNames] Required for type `human` only. An array of first names of the human in order of priority.
	 * @param  {string[]} [options.lastNames]  Required for type `human` only. An array of last names of the human in order of priority.
	 * @param  {string}   [options.fullName]   Required for type `org` only. The full name of the organization.
	 * @param  {string}   [options.nameAbbrev] For type `org` only. The name abbreviation of the organization.
	 * @return {string[]} Possible UEA codes for the codeholder in decreasing order of usability. May be empty.
	 */
	static suggestCodes ({
		type,

		firstNames = [],
		lastNames = [],

		fullName,
		nameAbbrev
	} = {}) {
		const normalize = x => {
			if (typeof x !== 'string') {
				return '';
			}
			return x
				.toLowerCase()
				.normalize('NFD')
				.replace(/[^a-z]/gi, '');
		};
		const data = {
			f: firstNames.map(normalize),
			l: lastNames.map(normalize),
			n: [ normalize(fullName) ],
			a: [ normalize(nameAbbrev) ]
		};
		if (!data.f.length) {
			data.f.push('');
		}
		if (!data.l.length) {
			data.l.push('');
		}

		let codes = new Set();

		if (type === 'human') {
			// Alg step 1-2
			for (let pattern of codeSuggestPatterns.human) {
				onePattern:
				for (let f of data.f) {
					for (let l of data.l) {
						let code = '';
						for (let bit of pattern) {
							if (typeof bit === 'string') {
								code += bit;
							} else { // array
								let datum = null;
								if (bit[0] === 'f') {
									datum = f;
								} else if (bit[0] === 'l') {
									datum = l;
								}
								if (datum.length < bit[1]) {
									break onePattern;
								}
								code += datum.substring(0, bit[1]);
							}
						}
						if (code.length === 6) {
							codes.add(code);
						}
					}
				}
			}

			// Alg step 3
			for (let f of data.f) {
				if (!f.length) {
					continue;
				}
				for (let n = 5; n > 0; n--) {
					let baseCode = f.substring(0, n);

					// Pad using
					// last char of base code
					codes.add(baseCode.padEnd(6, baseCode.slice(-1)));
					// last char of name
					codes.add(baseCode.padEnd(6, f.slice(-1)));
					// x
					codes.add(baseCode.padEnd(6, 'x'));
				}
			}

			// Alg step 4
			for (let l of data.l) {
				if (!l.length) {
					continue;
				}
				for (let n = 5; n > 0; n--) {
					let baseCode = l.substring(0, n);

					// Pad using
					// last char of base code
					codes.add(baseCode.padEnd(6, baseCode.slice(-1)));
					// last char of name
					codes.add(baseCode.padEnd(6, l.slice(-1)));
					// x
					codes.add(baseCode.padEnd(6, 'x'));
				}
			}

			// Remove codes starting with xx
			codes = [...codes].filter(x => {
				return x.substring(0, 2) !== 'xx';
			});

		} else if (type === 'org') {
			// Alg step 1
			for (let pattern of codeSuggestPatterns.org) {
				onePattern:
				for (let a of data.a) {
					for (let n of data.n) {
						let code = 'xx';
						for (let bit of pattern) {
							if (typeof bit === 'string') {
								code += bit;
							} else { // array
								let datum = null;
								if (bit[0] === 'a') {
									datum = a;
								} else if (bit[0] === 'n') {
									datum = n;
								}
								if (datum.length < bit[1]) {
									break onePattern;
								}
								code += datum.substring(0, bit[1]);
							}
						}
						if (code.length === 6) {
							codes.add(code);
						}
					}
				}
			}

			// TODO: Alg step 2

			codes = [...codes];
		}

		return codes;
	}
}

export default UEACode;
