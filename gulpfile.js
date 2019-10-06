const { parallel, src, dest } = require('gulp');
const watch = require('gulp-watch');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const babel = require('gulp-babel');
const header = require('gulp-header');
const pkg = require('./package.json');

const compileSrc = function (source, isBrowserBuild) {
	let stream = source.pipe(plumber());

	if (!isBrowserBuild) {
		stream = stream.pipe(header("import 'source-map-support/register';"))
	}

	return stream
		.pipe(sourcemaps.init())
		.pipe(babel({
				presets: [
					["@babel/env", {
						modules: isBrowserBuild ? false : undefined,
	                    useBuiltIns: 'usage',
	                    corejs: pkg.dependencies['core-js']
					}]
				],
				plugins: [
					"@babel/transform-async-to-generator",
					"@babel/plugin-proposal-export-namespace-from"
				]
			}))
		.pipe(sourcemaps.write('.'))
		.pipe(dest(isBrowserBuild ? 'dist-esm' : 'dist'));
};

exports['compile-node'] = function compileNode () {
	return compileSrc(src(['src/**/*.js']), false);
};
exports['compile-browser'] = function compileBrowser () {
	return compileSrc(src(['src/**/*.js']), true);
};
exports['compile'] = parallel(exports['compile-node'], exports['compile-browser']);
exports['watch-compile-node'] = function () {
	compileSrc(watch(['src/**/*.js']), false);
};
