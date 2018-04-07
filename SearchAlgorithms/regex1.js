'use strict';

const t = require('exectimer');
const ch = require('chalk');
const Tick = t.Tick;

module.exports = new (class Regex1Algorithm {
	constructor() {
	}

	search(data, input, MaxMatches) {
		let tInputs = input.split(/\s+/);

		/**
		 * Regex Parts by Priority: (Thoughts on various match variations for single regex pattern)
		 *  CS    Exact case-sensitive match surrounded by \b's
		 *  CS  Exact case-sensitive inter-word match
		 *  CS  UPPER Case Full Part
		 *  CS        Each Capital Matches a Capital Letter of a SingleWord (in order)
		 *  CS        Each Capital Matches a Capital Letter of the Starting Character of a Word (in order)
		 *  CI  Characters are matched across the input in order of input with unlimited characters between (tighter matches are scored higher)
		 *  CI  Characters are matched across the input in any order of input with unlimited characters between (tighter matches are scored higher)
		 *
		 *  ??    Matched across the input in any order from input with the match length being no more than 20..30..40.50% more than input.  so if input is data@50% then it could
		 *   be data with two other characters intermixed.
		 */

		let regParts = [
			this.Regex_CS_Exact_Bounded_Match,
			this.Regex_CS_Exact_Unbounded_Match,
			this.Regex_CS_Capitals_SingleWord_Match,
			this.Regex_CS_Capitals_FirstLetter_Match,
			this.Regex_CI_Ordered_Character_Match,
			this.Regex_CI_Unordered_Character_Match,
		];

		console.log('\nPattern Parts:');
		let tPatterns = regParts
			.map((regexFunc) => regexFunc(tInputs))
			.filter((v) => v)
			.map((pattern) => {console.log('\t%s\n', pattern);return pattern;});

		// return;
		// pattern = `(?:${pattern})*`;

		console.log('\nPatterns: %o\n\nData: %s\n\n', tPatterns, data);
		// console.log('\npattern: %s\n\ndata: "%s"\n', pattern, data);

		// return;


		// let sMatch = data.match(re);
		// console.log(sMatch);

		// Tick.wrap(function fn(done) {
		let tMatches = tPatterns
			.map((pattern) => {
				console.log(pattern);
				let re = new RegExp(pattern, 'gsi'), res = null, count = 0;
				do {
					res = re.exec(data);
					if(res) {
						// let match = [1, 2, 3, 4, 5, 6, 7, 8, 9]
						// 	.reduce((acc, cur) => {
						// 		return acc || (res[cur] ? [cur, res[cur]] : '');
						// 	}, '');
						// console.log('at %s, regEx(%d) matched: %s', ('' + res.index).padStart(5), match[0], match[1]);
						console.log(res);
						// console.log(match);
					}
				} while(res !== null && count++ < 50);
				console.log('\n\n');
			});

		// 	done();
		// });

		if(t.timers && t.timers.fn)
			t.timers.fn.printResults();

		// for(let part of tInputs) {
		// 	console.log(part);
		// }

//		console.log(`searching with ${input}`);
	}

	/**
	 * CS    Exact case-sensitive match surrounded by \b's
	 *
	 *  @param {string[]} tInputs
	 *  @returns string
	 */
	Regex_CS_Exact_Bounded_Match(tInputs) {
		return `\\b(${tInputs.join('|')})\\b`;
	}

	/**
	 * CS    Exact case-sensitive inter-word match
	 *
	 *  @param {string[]} tInputs
	 *  @returns string
	 */
	Regex_CS_Exact_Unbounded_Match(tInputs) {
		return `(${tInputs.join('|')})`;
	}

	/**
	 *  CS  UPPER Case Full Part
	 *  CS        Each Capital Matches a Capital Letter of a SingleWord (in order)
	 *
	 *  @param {string[]} tInputs
	 *  @returns string
	 */
	Regex_CS_Capitals_SingleWord_Match(tInputs) {
		return '';
	}

	/**
	 *  CS  UPPER Case Full Part
	 *  CS        Each Capital Matches a Capital Letter of the Starting Character of a Word (in order)
	 *
	 *  @param {string[]} tInputs
	 *  @returns string
	 */
	Regex_CS_Capitals_FirstLetter_Match(tInputs) {
		return '';
	}

	/**
	 *  CI  Characters are matched across the input in order of input with unlimited characters between (tighter matches are scored higher)
	 *
	 *  @param {string[]} tInputs
	 *  @returns string
	 */
	Regex_CI_Ordered_Character_Match(tInputs) {
		let pat =
				tInputs
					.map((input) => {
						return Array.from(input)
									.join('?.+?') + '?.+?';
					})
					.join('|');
		return `(${pat})`;
		// return `(${tInputs.join()`;
	}

	/**
	 *  CI  Characters are matched across the input in any order of input with unlimited characters between (tighter matches are scored higher)
	 *
	 *  @param {string[]} tInputs
	 *  @returns string
	 */
	Regex_CI_Unordered_Character_Match(tInputs) {
		return '';
	}
});
