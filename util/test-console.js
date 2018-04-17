'use strict';

module.exports = {};

const console = require('./console');

console.info('{green dodad %4d}', 1452);
console.log('info', 'dodad %4d', 641);
console.error('dodad {yellow %4d} {magenta %14d}', 41, 9474);
console.warn('dodad %4d', 91);
console.info('dodad %4d', 921);
console.debug('dodad %4d', 4144);
console.silly('dodad %4d', 6);

console.info('There were %2d {grey blind} %s found. data=%j', 3, '{red mice}', { found: 3 });
