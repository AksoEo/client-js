import XRegExp from 'xregexp';

/**
 * Checks recursively whether an object contains a buffer
 * @param  {Object} obj
 * @return {boolean}
 */
export function containsBuffer (obj) {
	if (obj instanceof Buffer) {
		return true;
	}
	else if (Array.isArray(obj)) {
		return obj.map(containsBuffer).reduce((a, b) => a || b, false);
	} else if (typeof obj === 'object' && obj !== null) {
		return Object.values(obj)
			.map(containsBuffer)
			.reduce((a, b) => a || b, false);
	}
	return false;
}

const bannedSearchChars = new XRegExp('[^\\p{L}\\p{N}\\s*+\\-"]', 'g');
const searchWordChars = new XRegExp('([\\p{L}\\p{N}]+)', 'g');
const searchOperators = /[*+\-"]/;
const searchWordsTooShort = new XRegExp(
	`
	(^|[^\\p{L}\\p{N}]) # Ensure it's the beginning of a word

	([\\p{L}\\p{N}]{1,2})(?!\\*) # Match any word shorter than three chars that doesn't have a wildcard at the end

	(?=$|[^\\p{L}\\p{N}]) # Ensure it's the end of a word
	`,
	'gx');
/**
 * Transforms a search string into what the user probably wanted
 * @param  {string} str
 * @return {string}
 */
export function transformSearch (str) {
	str = str.replace(bannedSearchChars, ' ');

	const containsOperators = searchOperators.test(str);

	if (containsOperators) {
		str = str.replace(searchWordsTooShort, '$1$2*$3');
	} else {
		str = str
			.match(searchWordChars)
			.map(w => w + '*')
			.join(' ');
	}

	return str;
}

// From API/src/routing/index.js
const querySearchWord = '[\\p{L}\\p{N}]';
const querySearchRegex = XRegExp(
	`^
	( [+-]?
		(
			  ( "(${querySearchWord}{3,}      | ${querySearchWord}+\\*)
				 (\\s+(${querySearchWord}{3,} | ${querySearchWord}+\\*))*" )

			| ( ${querySearchWord}{3,}        | ${querySearchWord}+\\*)
		)
	)

	( \\s+ [+-]?
		(
			  ( "(${querySearchWord}{3,}      | ${querySearchWord}+\\*)
				 (\\s+(${querySearchWord}{3,} | ${querySearchWord}+\\*))*" )

			| ( ${querySearchWord}{3,}        | ${querySearchWord}+\\*)
		)
	)*
	$`,

	'x'
);
export function isValidSearch (str) {
	return str.length <= 250 && querySearchRegex.test(str);
}
