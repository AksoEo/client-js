import fetchCookie from 'fetch-cookie';
import fetch, { Headers, FormData, Blob } from 'node-fetch';

export const makeFetch = cookieJar => fetchCookie(fetch, cookieJar);
export { Headers, FormData, Blob };
export const IS_WEB = false;
