'use strict';

const Chalk = require('chalk');

/**
 * Template function which gets around chalks need to escape {}\ characters in template inputs
 *
 * @param {string[]}    strings    Template strings
 * @param {string[]}    args    Template arguments
 *
 * @returns {string}
 */
function ch(strings, ...args) {
	let y = [
		strings
			.reduce((acc, val, idx) => {
				return acc + val + (args[idx] || '');
			}, '')
			.replace(/{(\W.+)}/sm, '\\{$1\\}'),
	];
	y.raw = y;

	return Chalk(y);
}

module.exports = ch;
