import fetchCookie from 'fetch-cookie';

export const makeFetch = cookieJar => fetchCookie(global.fetch, cookieJar);
export const Headers = global.Headers;
export const FormData = global.FormData;
export const Blob = global.Blob;
export const IS_WEB = false;
