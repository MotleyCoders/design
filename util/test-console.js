'use strict';

module.exports = {};

const console = require('./console');

console.section('Section 1');
console.info('s1 Line 1');
console.info('s1 Line 2');
console.info('');
console.section('Section 2');
console.info('s2 Line 1');
console.sectionEnd();
console.section('Section 3');
console.info('s3 Line 1');
console.info('s3 Line 2');
console.sectionEnd();
console.info('s1 Line 3');
console.sectionEnd();
console.section('Section 4');
console.sectionEnd();
console.section('Section 5');
console.info('s5 Line 1');
console.info('s5 Line 2');
console.sectionEnd();

console.info('{green dodad %4d}', 1452);
console.log('info', 'dodad %4d', 641);
console.error('dodad {yellow %4d} {magenta %14d}', 41, 9474);
console.warn('dodad %4d', 91);
console.info('dodad %4d', 921);
console.debug('dodad %4d', 4144);
console.silly('dodad %4d', 6);

console.info('There were %2d {grey blind} %s found. data=%j', 3, '{red mice}', { found: 3 });
