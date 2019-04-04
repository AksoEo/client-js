import msgpack from 'msgpack-lite';

export { default as Client } from './client';
export { default as AppClient } from './app-client';
export { default as UserClient } from './user-client';
export { default as UEACode } from './uea-code';

const msgpackCodec = msgpack.createCodec({
	int64: true
});
export { msgpackCodec };
