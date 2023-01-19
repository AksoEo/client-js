import fetchCookie from 'fetch-cookie';

export const makeFetch = cookieJar => fetchCookie(global.fetch, cookieJar);
export const Headers = global.Headers;
export const FormData = global.FormData;
export const Blob = global.Blob;
export const IS_WEB = false;

// fetch-cookie expects Headers to have a .raw() method that returns an object of all headers
Object.defineProperty(Headers.prototype, 'raw', {
	value () {
		const values = {};
		for (const key of this.keys()) {
			values[key] = this.get(key);
		}
		return values;
	},
	enumerable: false,
});
