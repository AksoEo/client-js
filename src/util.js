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
