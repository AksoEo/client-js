import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';

const inputOptions = isWeb => ({
	input: 'src/index.js',
	plugins: [
		resolve(),
		commonjs(),
		json(),
		alias({
			entries: [
				isWeb && ({ find: './fetch.*.js', replacement: './fetch.browser.js' }),
				!isWeb && ({ find: './fetch.*.js', replacement: './fetch.node.js' }),
			].filter(x => x)
		})
	],
	external: [
		// dependencies that should not be bundled into the file
		'fetch-cookie',
		'msgpack-lite',
		'node-fetch',
		'qrcode',
		'rfc4648',
		'xregexp',
	],
	moduleContext: (id) => {
		if (id.includes('formdata-node')) {
			// module expects `this` to be `globalThis`
			return 'globalThis';
		}
	}
});

export default [
	{
		output: [
			{
				file: 'dist/index.node.mjs',
				format: 'esm',
			},
			{
				file: 'dist/index.node.js',
				format: 'cjs',
			}
		],
		...inputOptions(false),
	},
	{
		output: {
			file: 'dist/index.browser.js',
			format: 'esm',
		},
		...inputOptions(true),
	}
];

