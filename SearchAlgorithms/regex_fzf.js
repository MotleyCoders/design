'use strict';

/**
 * Note: regex_fzf is a modified implementation of the search algorithm in junegunn/fzf
 * @see https://github.com/junegunn/fzf/blob/master/src/algo/algo.go
 * @see regex_fzf.md
 */

const t	= require('exectimer');
const ch	= require('chalk');
const Tick = t.Tick;


const scoreMatch		= 16;
const scoreGapStart		= -3;
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

// Character Classes
const CC_UPPER		= 1;		// Uppercase / Lowercase Flag
const CC_ALPHA		= 2;		// Alphabetical Character
const CC_NUM		= 4;		// Number Character
const CC_ALNUM1		= 6;		// AlphaNumeric NUM + ALPHA = 6 (7 if uppercase)
const CC_ALNUM2 	= 7;		// AlphaNumeric NUM + ALPHA = 6 (7 if uppercase)
const CC_BOUNDARY	= 8;

module.exports = new (class Regex1Algorithm {
	constructor() {
	}

	search(Data, Input, MaxMatches) {
		let tInputs = Input.split(/\s+/);

		let MetaData = /** @var {fzf.MatchMetaData} */ {
			DATA: Data.toLocaleUpperCase(),
			Data: Data,
			data: Data.toLocaleLowerCase(),
		};

		/**
		 * Looking over the source for fzf, looks like its much simpler than _v1 tried/failed to do.
		 * @see fzf/src/algo header
		 * Going to attempt the same/similar with regex
		 */

		console.log('\nInput: %s\n\nData:\n%s\n', Input, Data);
		console.log(0, Data);
		console.log('\n\n');

		tInputs
			.forEach((Input) => {
				MetaData.INPUT = Input.toLocaleUpperCase();
				MetaData.Input = Input;
				MetaData.input = Input.toLocaleLowerCase();

				let pattern = this.CreatePattern(Input);

				console.log('\nPattern: %s\n', pattern);

				// Tick.wrap(function fn(done) {
				let tMatches = this.MatchAll(pattern, MetaData.data);

				tMatches
					.sort((l, r) => l.match.length - r.match.length)
					.map((tMatch) => this.Score(tMatch, MetaData))
				;

				console.log(tMatches);

				console.log('\n\n');
				// done();
			});
		// });

		let tLineEnds = this.MatchAll('[\r\n]+', Data, NO_BACKTRACK);

		console.log(tLineEnds);

		if(t.timers && t.timers.fn)
			t.timers.fn.printResults();

		// for(let part of tInputs) {
		// 	console.log(part);
		// }

//		console.log(`searching with ${Input}`);

	}

	/**
	 * Creates a regular expression pattern from the input part
	 *
	 * @param {string} Input
	 *
	 * @returns {string}
	 */
	CreatePattern(Input) {
		return Array.from(Input)
			.join('.*?');
	}

	/**
	 * Scores a given match according to the scoring methodology
	 *
	 * @param {fzf.Match} tMatch				The match structure to score
	 * @param {fzf.MatchMetaData} MetaData		The current input/data state in various formats
	 */
	Score(tMatch, MetaData) {
		let c, inputAt = 0,
			[match, start, end] = Object.values(tMatch),
			{ INPUT, Input, input, DATA, Data, data } = MetaData;

		console.log(ch`  Scoring: "{magenta %s}" matching {cyan "%s"} (%d-%d) from "{bold {red %s}{green %s}{red %s}}"`, Input, match, start, end,
			start > 0 ? Data[start - 1] : '',
			Data.substr(start, (end - start)),
			end < Data.length ? Data[end] : ''
		);

		let Scores = {
			Boundary: 0,	// Boundary Character Score
			Consecutive: 0,	// Consecutive Characters Matched
		};

		// First character of match
		if(start === 0 || isBoundary(Data[start - 1]))
			Scores.Boundary += 1.5;		// Starting Boundary Worth More

		for(let j=0, lowerMatch=false; j < match.length; j++) {

			// noinspection JSValidateTypes
			if(Input == 'xxxxtse') {
				console.log(ch`      match[{yellow.bold %d}] = {yellow.bold %s}, input[{yellow.bold %d}] = {yellow.bold %s}, consecutive = {yellow.bold %d}`, j, match[j], inputAt, Input[inputAt], Scores.Consecutive);
			}
			if(match[j] === input[inputAt])  {
				if(isBoundary(Data[start + j - 1]))
					Scores.Boundary += 1.0;

				if(j != 0 && match[j - 1] === Input[inputAt - 1])
					Scores.Consecutive++;
				inputAt++;
			}
		}

		if(inputAt != Input.length) {
			console.log(ch`    {red inputAt != input.length for {white input} = {green %s}`);
		}

		if(end === Data.length || isBoundary(Data[end]))
			Scores.Boundary += 1.5;		// Ending on Boundary Worth More

		if(Data[start - 1] === Data[end])
			Scores.Boundary += 0.5;		// If the starting/ending boundary are the same character, slight bonus

		console.log('    Scores:');
		console.log('      Boundary   : ', Scores.Boundary);
		console.log('      Consecutive: ', Scores.Consecutive);
		console.log('\n');
	}

	/** For Reference (from fzf)

	 -- We prefer matches at special positions, such as the start of a word, or
	 uppercase character in camelCase words.

	 	That is, we prefer an occurrence of the pattern with more characters
	 	matching at special positions, even if the total match length is longer.

	 	"e.g. "fuzzyfinder" vs. "fuzzy-finder" on "ff"
	 	                         ````````````
	 	Also, if the first character in the pattern appears at one of the special
	 	positions, the bonus point for the position is multiplied by a constant
	 	as it is extremely likely that the first character in the typed pattern
	 	has more significance than the rest.

	 	"e.g. "fo-bar" vs. "foob-r" on "br"
	    	   ``````
	 -- But since fzf is still a fuzzy finder, not an acronym finder, we should also
	 consider the total length of the matched substring. This is why we have the
	 gap penalty. The gap penalty increases as the length of the gap (distance
	 between the matching characters) increases, so the effect of the bonus is
	 eventually cancelled at some point.

	 "e.g. "fuzzyfinder" vs. "fuzzy-blurry-finder" on "ff"
	        ```````````

	 	Consequently, it is crucial to find the right balance between the bonus
	 	and the gap penalty. The parameters were chosen that the bonus is cancelled
	 	when the gap size increases beyond 8 characters.

	 	The bonus mechanism can have the undesirable side effect where consecutive
	 	matches are ranked lower than the ones with gaps.

	 	"e.g. "foobar" vs. "foo-bar" on "foob"
	                        ```````

	 	To correct this anomaly, we also give extra bonus point to each character
	 	in a consecutive matching chunk.

	 	"e.g. "foobar" vs. "foo-bar" on "foob"
	 	       ``````

	 	The amount of consecutive bonus is primarily determined by the bonus of the
	 	first character in the chunk.

	 	"e.g. "foobar" vs. "out-of-bound" on "oob"
	 	                    ````````````
 */

	/**
	 *	Matches the given ${pattern} against the ${data} repeatedly and returns the matches
	 *
	 * @param {string} pattern		The regular expression pattern to find matches in ${data} for
	 * @param {string} data			The data which we are matching against
	 * @param {boolean} backtrack    Whether we backtrack the lastIndex to the 2nd match character after the last match
	 *
	 * @returns {fzf.Match[]}
	 */
	MatchAll(pattern, data, backtrack = true) {
		let tMatches = [];

		let re = new RegExp(pattern, 'gim'), res = null;
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


/**
 * @param {string} c
 *
 * @return {number}  Returns a set of flags as specified by CC_* constants
 */
function charClass(c) {
	if(c === undefined)
		return 0;

	if(c >= 'a' && c <= 'z')
		return CC_ALPHA;

	if(c >= '0' && c <= '9')
		return CC_NUM;

	if(c >= 'A' && c <= 'Z')
		return CC_ALPHA | CC_UPPER;

	return CC_BOUNDARY;
}

/**
 * @param {string} c
 *
 * @return {boolean}  True if ${c} is a nonAlphaNum
 */
function isBoundary(c) {
	return charClass(c) === CC_BOUNDARY;
}
