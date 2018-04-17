'use strict';

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf }		= format;

const { sprintf } = require('sprintf-js');

const ch = require('./chalky');

const myOutput = printf(info => {
	if(info.timestamp)
		info.message = `{grey ${info.timestamp}}: ${info.message}`;

	if(info.splat) {
		return ch`${sprintf(info.message, ...info.splat)}`;
	}

	return ch`${info.message}`;
});

/** @type {WinstonChalkyConsole} */
const logger = createLogger({
	format:		combine(
		timestamp({ format: 'HH:mm:ss A' }),
		myOutput,
	),
	transports: [new transports.Console({ level: 'silly' })],
});

// noinspection JSUndefinedPropertyAssignment
logger._splat = function _splat(info, tokens, splat) {
	info.splat = splat;
	this.write(info);
};

function wrappedLog(level, msg, ...args) {
	// If there are any % arguments, we append %s and an additional blank string,
	// then let the original take it with our own _splat implementation
	if(msg.match(/%[^%]/)) {
		msg += '%s';
		args.push('');
	}
	this._log(level, msg, ...args);
}

// noinspection JSUndefinedPropertyAssignment
logger._log = logger.log;
logger.log		= wrappedLog.bind(logger);


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
