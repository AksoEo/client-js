import msgpack from 'msgpack-lite';

export { default as UEACode } from './uea-code';
export { default as AppClient } from './app-client';

const msgpackCodec = msgpack.createCodec({
	int64: true
});
export { msgpackCodec };
