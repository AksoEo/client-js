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
		return obj.map(containsBuffer).reduce((a, b) => a || b);
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
const searchWordsTooShort = new XRegExp('(^|[^\\p{L}\\p{N}])([\\p{L}\\p{N}]{1,2})([^\\p{L}\\p{N}]|$)', 'g');
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
