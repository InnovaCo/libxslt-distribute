/**
 * Properly detects architecture of currently running Node.js process
 */
'use strict';

var env = process.env;
var winEnv = module.exports = {
	PROGRAMFILES_X86: env['PROGRAMFILES(X86)'] || env['PROGRAMFILES'],
	PROGRAMFILES_X64: env.PROGRAMW6432, // "C:\Program Files" on x64
	USERPROFILE: env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH,
	X64: process.arch == 'x64' || 'PROCESSOR_ARCHITEW6432' in env
};

module.exports = function() {
	if (process.platform === 'win32') {
		var p = 'ia32';
		if (env.PLATFORM === 'x64' || (!env.APPVEYOR && winEnv.X64)) {
			p = 'x64';
		}

		return p;
	}
	return process.arch;
};