/* eslint-disable no-undef */
export const makeFetch = () => globalThis.fetch.bind(globalThis);
export const Headers = globalThis.Headers;
export const FormData = globalThis.FormData;
export const Blob = globalThis.Blob;
export const IS_WEB = true;
