/**
 * Creates a bundle with standalone module. Returns a stream with ZIP file
 */
'use strict';

var path = require('path');
var vfs = require('vinyl-fs');
var through = require('through2');
var zip = require('gulp-zip');

/**
 * List of files to add into bundle. Assumes that the `cwd` for these files is
 * a node-libxsl package dir
 * @type {Array}
 */
const bundleFiles = [
	'build/Release/node-libxslt.node',
	'index.js',
	'node_modules/libxmljs-mt/build/Release/xmljs.node',
	'node_modules/libxmljs-mt/index.js',
	'node_modules/libxmljs-mt/lib/*.js',
];

module.exports = function(src, archiveName) {
	var src = src || process.cwd();
	return vfs.src(bundleFiles, {cwd: src, base: src})
	.pipe(through.obj(function(file, enc, next) {
		var filePath = file.relative.replace(/\\/g, '/');
		if (/\.node$/.test(filePath)) {
			// native extension, simply trim folders
			file.path = path.join(file.base, path.basename(filePath));
		} else if (/libxmljs-mt\/index\.js$/.test(filePath)) {
			file.contents = rewriteLibXML(file.contents);
			file.path = path.join(file.base, 'libxml.js');
		} else if (path.basename(filePath) === 'index.js') {
			file.contents = rewriteLibXSLT(file.contents);
			file.path = path.join(file.base, 'libxslt.js');
		} else if (/\blibxmljs-mt\/lib\b/.test(filePath)) {
			file.path = path.join(file.base, 'lib', path.basename(filePath));
		}

		next(null, file);
	}))
	.pipe(zip(archiveName));
};

function rewriteLibXML(contents) {
	if (Buffer.isBuffer(contents)) {
		contents = contents.toString();
	}

	contents = contents.replace(/\b(module\.exports\.version)\b/, '// $1');
	return new Buffer(contents);
}

function rewriteLibXSLT(contents) {
	if (Buffer.isBuffer(contents)) {
		contents = contents.toString();
	}

	contents = contents.replace('require(\'libxmljs-mt\')', 'require(\'./libxml\')');
	return new Buffer(contents);
}