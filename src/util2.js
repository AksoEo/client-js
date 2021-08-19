import msgpack from 'msgpack-lite';

/**
 * Converts any byte arrays (e.g. Uint8Array) to NodeJS buffers for correct msgpack encoding.
 * @param  {Object} obj
 * @return {Object}
 */
export function byteArraysToBuffers (obj) {
	if (obj instanceof Buffer) {
		return obj;
	} else if (obj instanceof ArrayBuffer || (obj && obj.buffer instanceof ArrayBuffer)) {
		return Buffer.from(obj);
	} else if (Array.isArray(obj)) {
		return obj.map(byteArraysToBuffers);
	} else if (typeof obj === 'object' && obj !== null) {
		return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, byteArraysToBuffers(v)]));
	}
	return obj;
}

/**
 * Checks recursively whether an object contains any kind of byte buffer
 * @param  {Object} obj
 * @return {boolean}
 */
export function containsBuffer (obj) {
	if (obj instanceof Buffer || obj instanceof ArrayBuffer || (obj && obj.buffer instanceof ArrayBuffer)) {
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
