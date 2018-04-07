'use strict';

/**
 * Note: regex_fzf is a modified implementation of the search algorithm in junegunn/fzf
 * @see https://github.com/junegunn/fzf/blob/master/src/algo/algo.go
 * @see regex_fzf.md
 */

const t = require('exectimer');
const ch = require('chalk');
const Tick = t.Tick;


const scoreMatch        = 16;
const scoreGapStart     = -3;
const scoreGapExtention = -1;

// We prefer matches at the beginning of a word, but the bonus should not be
// too great to prevent the longer acronym matches from always winning over
// shorter fuzzy matches. The bonus point here was specifically chosen that
// the bonus is cancelled when the gap between the acronyms grows over
// 8 characters, which is approximately the average length of the words found
// in web2 dictionary and my file system.
const bonusBoundary = scoreMatch / 2;

// Although bonus point for non-word characters is non-contextual, we need it
// for computing bonus points for consecutive chunks starting with a non-word
// character.
const bonusNonWord = scoreMatch / 2;

// Edge-triggered bonus for matches in camelCase words.
// Compared to word-boundary case, they don't accompany single-character gaps
// (e.g. FooBar vs. foo-bar), so we deduct bonus point accordingly.
const bonusCamel123 = bonusBoundary + scoreGapExtention;

// Minimum bonus point given to characters in consecutive chunks.
// Note that bonus points for consecutive matches shouldn't have needed if we
// used fixed match score as in the original algorithm.
const bonusConsecutive = -(scoreGapStart + scoreGapExtention);

// The first character in the typed pattern usually has more significance
// than the rest so it's important that it appears at special positions where
// bonus points are given. e.g. "to-go" vs. "ongoing" on "og" or on "ogo".
// The amount of the extra bonus should be limited so that the gap penalty is
// still respected.
const bonusFirstCharMultiplier = 2;




// Constant to MatchAll indicating it should not backtrack the lastIndex in MatchAll
const NO_BACKTRACK = false;

module.exports = new (class Regex1Algorithm {
	constructor() {
	}

	search(data, input, MaxMatches) {
		let tInputs = input.split(/\s+/);
		/**
		 * Looking over the source for fzf, looks like its much simpler than _v1 tried/failed to do.
		 * @see fzf/src/algo header
		 * Going to attempt the same/similar with regex
		 */

		console.log('\nInput: %s\n\nData:\n%s\n', input, data);
		console.log(0, data);
		console.log('\n\n');

		tInputs
			.forEach((input) => {

				let pattern = Array.from(input)
							   .join('.*?');

				console.log('\nPattern: %s\n', pattern);

			// Tick.wrap(function fn(done) {
				let tMatches = this.MatchAll(pattern, data);

				tMatches
					.sort( (l, r) => l.match.length - r.match.length)
					.map((match) => this.Score(match, data))
					;

				console.log(tMatches);

				console.log('\n\n');
				// done();
			});
		// });

		let tLineEnds = this.MatchAll('[\r\n]+', data, NO_BACKTRACK);

		console.log(tLineEnds);

		if(t.timers && t.timers.fn)
			t.timers.fn.printResults();

		// for(let part of tInputs) {
		// 	console.log(part);
		// }

//		console.log(`searching with ${input}`);

	}

	Score(match, data) {

	}

	MatchAll(pattern, data, backtrack=true) {
		let tMatches = [];

		let re = new RegExp(pattern, 'gi'), res = null;
		do {
			res = re.exec(data);
			if(res) {
				tMatches.push({ match: res[0], start: res.index, end: re.lastIndex });
				if(backtrack)
					re.lastIndex = res.index + 1;
			}
		} while(res !== null);
		return tMatches;
	}
});


