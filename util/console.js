'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf }		= format;

const { sprintf } = require('sprintf-js');

const ch = require('./chalky');

let logger;

const myOutput = printf(info => {
	if(info.timestamp)
		info.message = `{grey ${info.timestamp}}: ${logger.indentStr.repeat(logger.indentLevel)}${info.message}`;

	if(info.splat) {
		return ch`${sprintf(info.message, ...info.splat)}`;
	}

	return ch`${info.message}`;
});

/** @type {WinstonChalkyConsole} */
logger = createLogger({
	format:		combine(
		timestamp({ format: 'HH:mm:ss A' }),
		myOutput,
	),
	transports: [new transports.Console({ level: 'silly' })],
});

logger.indentStr = '   ';
logger.indentLevel = 0;

logger.__proto__.section = function section(msg, ...args) {
	this.log('info', msg, ...args);
	this.indentLevel++;
	return this;
};

logger.__proto__.sectionEnd = function sectionEnd() {
	this.indentLevel = Math.max(this.indentLevel-1, 0);
	return this;
};

// noinspection JSUndefinedPropertyAssignment
/**
 * We override winston _splat with our own simpler version as the standard splat
 *    only takes arguments matching the simple console replacements, of the remaining
 *    arguments only the first is put into meta, the rest are discarded.  This corrects
 *    that but also sacrifices the meta field.   As of winston@3.0.0-rc4
 *
 * @param {TransformableInfo} info	Message level
 * @param {string[]} tokens			The standard tokens recognized
 * @param {*} splat					The extra arguments
 * @private
 */
logger._splat = function _splat(info, tokens, splat) {
	// noinspection JSUndefinedPropertyAssignment
	info.splat = splat;
	this.write(info);
};

// noinspection JSUndefinedPropertyAssignment
logger._log = logger.log;

/**
 * We wrap the winston logger because it only recognizes simple %s/%d, etc patterns
 *    It also must detect at least one standard %s, so we append a blank %s to the
 *    arguments so that it will call the branch we need.  As of winston@3.0.0-rc4
 *
 * @param {string} level
 * @param {string} msg
 * @param {*} args
 */
logger.__proto__.log = function wrappedLog(level, msg, ...args) {
	// If there are any % arguments, we append %s and an additional blank string,
	// then let the original take it with our own _splat implementation
	if(msg.match(/%[^%]/)) {
		msg += '%s';
		args.push('');
	}
	this._log(level, msg, ...args);
	return this;
};

/**
 * At some point I may want to make this more configurable, at this time this effectively
 * creates what I want 'console' to be, which supports:
 *   - sprintf-js form console.*() calls
 *   - Chalk style coloring - e.g. {green.bold I'm green}
 *
 * @example
 *    console.info('There were %2d {grey blind} %s found. data=%o', 3, '{red mice}', { found: 3 });
 *    // 06:08:42 AM: There were  3 blind mice found. data={ found: 3 }
 *    // ^gray                      ^grey ^red
 *
 * @type {WinstonChalkyConsole}
 */

module.exports = logger;
