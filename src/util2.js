import msgpack from 'msgpack-lite';

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

export const msgpackCodec = msgpack.createCodec({
	int64: true
});
