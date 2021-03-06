/**
 * Creates a standalone distribution bundle with LibXSLT and LibXML node modules,
 * compiled. Simply download and use it.
 *
 * This script should work with Node v0.12
 */
'use strict';

var path = require('path');
var vfs = require('vinyl-fs');
var through = require('through2');
var parseUrl = require('url').parse;
var bundle = require('./lib/bundle');
var publish = require('./lib/publish');
var pkg = require('./package.json');

module.exports = function(bundleName) {
	bundleName = bundleName || createBundleName();
	var src = path.resolve(process.cwd(), process.argv[2] || '.');
	var release = createReleasePayload(src);
	
	console.log('Creating bundle %s from %s', bundleName, src);
	bundle(src, bundleName + '.zip')
	.pipe(through.obj(function(file, enc, next) {
		release.assets.push(file);
		next(null, file);
	}, function(next) {
		console.log('Publishing assets');
		publish(release).then(next, next);
	}));
};

function createBundleName() {
	var nodeVersion = process.version.match(/v\d+\.\d+/)[0];
	return ['libxslt', nodeVersion, process.platform, process.arch].join('-');
}

function createReleasePayload(src) {
	// create release with LibXSLT version
	var libxsltPkg = require(path.resolve(src, 'package.json'));
	var repo = parseUrl(pkg.config.publishRepo).pathname.slice(1).replace(/\.git$/, '');
	return {
		repo: repo,
		release: 'v' + libxsltPkg.version,
		assets: []
	};
}

if (require.main === module) {
	module.exports();
}