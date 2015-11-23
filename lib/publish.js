/**
 * Updates GitHub release with given file for given version
 */
'use strict';

var fs = require('fs');
var path = require('path');
var extend = require('xtend');
var chalk = require('chalk');
var request = require('request').defaults({
	json: true,
	headers: {
		accept: 'application/vnd.github.v3+json',
		authorization: 'token ' + process.env.PUBLISH_TOKEN,
		'user-agent': 'LibXSLT publisher bot'
	}
});
var expectResponse = require('./utils').expectResponse;
require('es6-promise').polyfill();

if (!process.env.PUBLISH_TOKEN) {
	throw new Error('No PUBLISH_TOKEN env variable');
}

module.exports = function(data) {
	if (!data.domain) {
		data = extend(data, {domain: 'https://api.github.com'});
	}

	return getReleases(data)
	.then(function(releases) {
		// Check if given release exists. If so, we should update it,
		// otherwise create new one
		var current = releases.reduce(function(prev, cur) {
			return cur.name === data.release ? cur : prev;
		}, null);
		console.log(current ? 'Found release for %s' : 'No release for %s', chalk.green(data.release));
		return current ? Promise.resolve(current) : createRelease(data);
	})
	.then(function(release) {
		// create an assets upload pipeline: check if asset with given name exists;
		// if so, delete it first, then upload a new version
		var assetsToUpload = data.assets || [];
		if (!Array.isArray(assetsToUpload)) {
			assetsToUpload = [assetsToUpload];
		}

		var existingAssets = (release.assets || []).reduce(function(result, asset) {
			result[asset.name] = asset;
			return result;
		}, {});

		var pipeline = Promise.resolve();
		assetsToUpload.forEach(function(asset) {
			var ex = existingAssets[path.basename(asset.relative)];
			if (ex) {
				pipeline = pipeline.then(function() {
					return deleteAsset(data, ex.id);
				});
			}
			pipeline = pipeline.then(function() {
				uploadAsset(release, asset);
			});
		});
		return pipeline;
	});
};


/**
 * Fetches all available releases for given repo
 * @param  {String} repo Path to repo
 * @return {Promise}
 */
function getReleases(data) {
	return new Promise(function(resolve, reject) {
		var url = releaseApiEndpoint(data);
		console.log('Fetching releases from %s', chalk.underline(url));
		request(url, expectResponse(resolve, reject));
	});
}

/**
 * Creates new release for given payload
 * @param  {Object} data
 * @return {Promise}
 */
function createRelease(data) {
	console.log('Creating release %s', chalk.green(data.release));
	return new Promise(function(resolve, reject) {
		request.post(releaseApiEndpoint(data), {body: {
			tag_name: data.release,
			target_commitish: data.target || 'master',
			name: data.release
		}}, expectResponse(resolve, reject, 201));
	});
}

function uploadAsset(release, asset) {
	return new Promise(function(resolve, reject) {
		console.log('Uploading asset %s for release %s', chalk.yellow(asset.relative), chalk.green(release.name));
		var fileName = path.basename(asset.relative);
		var uploadUrl = release.upload_url.split('{')[0] + '?name=' + fileName;
		
		asset.pipe(request.post(uploadUrl, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Length': asset.contents.length,
			}
		}))
		.on('error', reject)
		.on('end', resolve);
	});
}

function deleteAsset(data, assetId) {
	return new Promise(function(resolve, reject) {
		console.log('Removing asset %s', chalk.red(assetId));
		request.del(
			releaseApiEndpoint(data, '/assets/' + assetId), 
			expectResponse(resolve, reject, 204)
		);
	});
}

function releaseApiEndpoint(data, suffix) {
	return data.domain + '/repos/' + data.repo + '/releases' + (suffix || '');
}