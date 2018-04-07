#!/usr/bin/env node --harmony

"use strict";

let fs = require('fs');

let program = require('commander');

program
	.arguments('<search> [file]')
	.option('-a, --algorithm <name>', 'The algorithm to <search> <file> contents.')
	.action(function(search, file = 'files.txt', command) {
		if(!fs.existsSync(file))
			return ExitError(`File '${file}' does not exist.`);

		let contents = fs.readFileSync(file, 'utf8');
		let algo = require(`./SearchAlgorithms/${program.algorithm || 'regex_fzf'}`);
		algo.search(contents, search);
		process.exit(0);
	})
	.parse(process.argv)
	.help();

function ExitError(message) {
	console.error(message);
	program.help();
}
