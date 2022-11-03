import XRegExp from 'xregexp';

// From API/src/routing/index.js
const querySearchWord = '[\\p{L}\\p{N}]';
const querySearchToken = `((\\s*${querySearchWord}{3,}\\s*) | (\\s*${querySearchWord}{2,}\\*\\s*))`;
const querySearchSubRegex =
	`(
		( "${querySearchToken}(\\s+${querySearchToken})*" ) |
		( ${querySearchToken} )
	)`;
const querySearchRegex = XRegExp(
	`^
	( [+-]? ${querySearchSubRegex} )
	( \\s+ [+-]? ${querySearchSubRegex} )*
	$`,

	'x'
);

export function isValidSearch (str) {
	return str.length <= 250 && querySearchRegex.test(str);
}

const bannedSearchChars = new XRegExp('[^\\p{L}\\p{N}\\s*+\\-"]', 'g');
const searchWordChars = new XRegExp('([\\p{L}\\p{N}]+)', 'g');
const searchOperators = /[*+\-"]/;
const oneCharSearchWords = new XRegExp(
	`
	(^|[^\\p{L}\\p{N}]) # Ensure it's the beginning of a word

	([\\p{L}\\p{N}]) # Match any one-letter word

	(?=$|[^\\p{L}\\p{N}]) # Ensure it's the end of a word
	`,
	'gx');
const twoCharSearchWords = new XRegExp(
	`
	(^|[^\\p{L}\\p{N}]) # Ensure it's the beginning of a word

	([\\p{L}\\p{N}]{2})(?!\\*) # Match any two-letter word that doesn't have a wildcard at the end

	(?=$|[^\\p{L}\\p{N}]) # Ensure it's the end of a word
	`,
	'gx');
/**
 * Transforms a search string into what the user probably wanted
 * @param  {string} str
 * @return {string}
 */
export function transformSearch (str) {
	str = str
		.replace(bannedSearchChars, ' ')
		.replace(oneCharSearchWords, '$1');

	const containsOperators = searchOperators.test(str);
	if (containsOperators) {
		str = str.replace(twoCharSearchWords, '$1$2*');
	} else {
		str = str
			.match(searchWordChars)
			.map(w => w + '*')
			.join(' ');
	}

	return str;
}
