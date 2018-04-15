'use strict';

/**
 * Note: regex_fzf is a modified implementation of the search algorithm in junegunn/fzf
 * @see https://github.com/junegunn/fzf/blob/master/src/algo/algo.go
 * @see regex_fzf.md
 */


const t	= require('exectimer');
const ch	= require('chalk');
const Tick = t.Tick;

// Temporary Usage
// noinspection JSUnusedLocalSymbols
let _, __;

const scoreMatch			= 16;
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


const ScoreBase     = 16;
const Scoring       = {};
Scoring.Boundary    = ScoreBase / 2;
Scoring.Consecutive = ScoreBase / 4;
Scoring.Capitals    = ScoreBase;
Scoring.GapPenalty  = -ScoreBase / 8;

console.log(Scoring);


// Flags to MatchAll
const NO_BACKTRACK		= 1;	// Do not backtrack the lastIndex
const CASE_SENSITIVE = 2;	// Match case sensitively

// Character Classes
const CC_UPPER		= 1;		// Uppercase / Lowercase Flag
const CC_ALPHA		= 2;		// Alphabetical Character
const CC_NUM		= 4;		// Number Character
const CC_ALNUM1	= 6;		// AlphaNumeric NUM + ALPHA = 6 (7 if uppercase)
const CC_ALNUM2	= 7;		// AlphaNumeric NUM + ALPHA = 6 (7 if uppercase)
const CC_BOUNDARY = 8;

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

		// console.log('\nInput: %s\n\nData:\n%s\n', Input, Data);
		// console.log(0, Data);
		// console.log('\n\n');

		tInputs
			.forEach((Input) => {
				MetaData.INPUT = Input.toLocaleUpperCase();
				MetaData.Input = Input;
				MetaData.input = Input.toLocaleLowerCase();

				let pattern = this.CreatePattern(Input),
					tMatches;

				console.log('\nPattern: %s', pattern);

				// Tick.wrap(function fn(done) {

				// If our input pattern is not all lowercase, match case sensitively
				if(MetaData.Input !== MetaData.input)
					tMatches = this.MatchAll(pattern, MetaData.Data, CASE_SENSITIVE);
				else
					tMatches = this.MatchAll(pattern, MetaData.data);

				console.log(ch`  {yellow %d matches} for "{magenta %s}"\n`, tMatches.length, Input);

				// tMatches = tMatches.slice(0, 1);

				tMatches
				// .sort((l, r) => l.match.length - r.match.length)
					.map((tMatch) => this.Score(tMatch, MetaData))
				;

				// console.log(tMatches);

				// console.log('\n\n');
				// done();
			});
		// });

		let tLineEnds = this.MatchAll('[\r\n]+', Data, NO_BACKTRACK);
		console.log(ch`{bold Total Lines:} %d`, tLineEnds.length);
		// console.log(tLineEnds);

		// if(t.timers && t.timers.fn)
		// 	t.timers.fn.printResults();

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
		return '(' + (
			Array.from(Input)
				.join(`)(.*?)(`)
		) + ')';
	}

	/**
	 * Scores a given match according to the scoring methodology
	 *
	 * @param {fzf.Match} tMatch                The match structure to score
	 * @param {fzf.MatchMetaData} MetaData        The current input/data state in various formats
	 */
	Score(tMatch, MetaData) {
		let at = 0;

		let [tParts, start, end] = Object.values(tMatch),
			{
				INPUT, Input, input,
				DATA, Data, data,
			}						= MetaData;

		console.log(ch`  Scoring Match: "{red %s}%s{red %s}" (%d-%d)`,
			['\r', '\n', undefined].indexOf(Data[start - 1]) == -1 ? Data[start - 1] : '^',

			tMatch.tParts
				.slice(1)
				.map((v, i) =>
					i % 2 == 0
					? ch`{green.bold ${v}}`
					: ch`{gray ${v}}`,
				)
				.join(''),

			['\r', '\n', undefined].indexOf(Data[end]) == -1 ? Data[end] : '$',
			start, end,
		);

		// console.log(tMatch);

		/** @type {fzf.MatchClasses} */
		let Points = {
			Boundary:		0,
			Consecutive: 	0,
			Capitals:		0,
			GapLength:		0,
		};

		// First character of match
		if(start === 0 || isBoundary(Data[start - 1]))
			Points.Boundary += 1.5;		// Starting Boundary Worth More (Gets an additional 1.0 during pattern parsing)

		tParts
			.forEach((match, idx) => {
				if(idx == 0)
					return;

				let matchLength = match.length;

				if(idx % 2 == 0) { // Skips 'in-between' matches and the $0 match (whole match)
					Points.GapLength += matchLength;
					at += matchLength;
					return;
				}

				// console.log('  %d: "%s", at=%d', idx, match, at);

				// noinspection JSValidateTypes
				// if(Input == 'xxxxtse') {
				// 	console.log(ch`      match[{yellow.bold %d}] = {yellow.bold %s}, input[{yellow.bold %d}] = {yellow.bold %s}, consecutive = {yellow.bold %d}`, j, match[j],
				// 		inputAt,
				// 		Input[inputAt], Points.Consecutive);
				// }

				// idx % 2 == 1 == our input characters

				/** Boundary Checking */
				// If the character before our current one is a boundary
				if(isBoundary(Data[start + at - 1]))
					Points.Boundary += 1.0;

				// If our current character is a boundary match, double-boundary matach
				if(isBoundary(match))
					Points.Boundary += 2.0;

				/** Capital Case Match */
				if(charClass(match) & CC_UPPER) {
					Points.Capitals++;
				}

				/** Consecutive Characters */
					// If the last in-between was zero length (counts current)
					// 	OR the next one is zero length (counts current as its last of consecutive streak)
				let prev = tMatch.tParts[idx - 1].length == 0,
					next = tMatch.tParts[idx + 1] !== undefined ? tMatch.tParts[idx + 1].length === 0 : false;

				if(prev || next) {
					Points.Consecutive++;
				}
				// console.debug(ch`    {magenta Conseuctive Match}: "{green %s}" idx=%d, prev.l=%d, next.l=%d, match=%b`,
				// 	match, idx, tMatch.tParts[idx - 1].length, tMatch.tParts[idx + 1] !== undefined ? tMatch.tParts[idx + 1].length : 9999);

				at += match.length;
			});

		// if(inputAt != Input.length) {
		// 	console.log(ch`    {red inputAt(%d) != input.length for {white input}} = {green %s}`, inputAt, Input);
		// }

		if(end === Data.length || isBoundary(Data[end]))
			Points.Boundary += 1.5;		// Ending on Boundary Worth More

		if(Data[start - 1] === Data[end])
			Points.Boundary += 0.5;		// If the starting/ending boundary are the same character, slight bonus

		/** @type {fzf.MatchScores} */
		let Scores = {
			Boundary:    Points.Boundary * Scoring.Boundary,
			Consecutive: Points.Consecutive * Scoring.Consecutive,
			Capitals:    Points.Capitals * Scoring.Capitals,
			GapPenalty:  Points.GapLength * Scoring.GapPenalty,
		};

		tMatch.Points = Points;
		tMatch.Scores = Scores;

		tMatch.score		=
			Object.values(Scores)
				.reduce((acc, val) => acc + val, 0);

		console.log('    Score: %d', tMatch.score);
		console.log('         Boundary: %f = %f * %d', Scores.Boundary, Points.Boundary, Scoring.Boundary);
		console.log('      Consecutive: %f = %f * %d', Scores.Consecutive, Points.Consecutive, Scoring.Consecutive);
		console.log('         Capitals: %f = %f * %d', Scores.Capitals, Points.Capitals, Scoring.Capitals);
		console.log('        GapLength: %f = %f * %d', Scores.GapPenalty, Points.GapLength, Scoring.GapPenalty);
		console.log('\n');
	}

	/** For Reference (from fzf)

	 -- We prefer matches at special positions, such as the start of a word, or
	 uppercase character in camelCase words.

	 That is, we prefer an occurrence of the pattern with more characters
	 matching at special positions, even if the total match length is longer.

	 "e.g. "fuzzyfinder" vs. "fuzzy-finder" on "ff"
	 >                        ````````````

	 Also, if the first character in the pattern appears at one of the special
	 positions, the bonus point for the position is multiplied by a constant
	 as it is extremely likely that the first character in the typed pattern
	 has more significance than the rest.

	 "e.g. "fo-bar" vs. "foob-r" on "br"
	 >      ``````

	 ??  -- But since fzf is still a fuzzy finder, not an acronym finder, we should also
	 consider the total length of the matched substring. This is why we have the
	 gap penalty. The gap penalty increases as the length of the gap (distance
	 between the matching characters) increases, so the effect of the bonus is
	 eventually cancelled at some point.

	 "e.g. "fuzzyfinder" vs. "fuzzy-blurry-finder" on "ff"
	 >      ```````````

	 Consequently, it is crucial to find the right balance between the bonus
	 and the gap penalty. The parameters were chosen that the bonus is cancelled
	 when the gap size increases beyond 8 characters.

	 ?? The bonus mechanism can have the undesirable side effect where consecutive
	 matches are ranked lower than the ones with gaps.

	 "e.g. "foobar" vs. "foo-bar" on "foob"
	 >                   ```````

	 To correct this anomaly, we also give extra bonus point to each character
	 in a consecutive matching chunk.

	 "e.g. "foobar" vs. "foo-bar" on "foob"
	 >      ``````

	 ?? The amount of consecutive bonus is primarily determined by the bonus of the
	 first character in the chunk.

	 "e.g. "foobar" vs. "out-of-bound" on "oob"
	 >                   ````````````
	 */

	/**
	 * Matches the given ${pattern} against the ${data} repeatedly and returns the matches
	 *
	 * @param {string} pattern            The regular expression pattern to find matches in ${data} for
	 * @param {string} data                The data which we are matching against
	 * @param {number} flags            Bitfield of flags indicating options
	 *
	 * @returns {fzf.Match[]}
	 */
	MatchAll(pattern, data, flags = 0) {
		let tMatches = [];

		// console.log('\n\n%s\n', pattern);

		// Tick.wrap(function fn(done) {
		let reFlags = 'gm';
		if(!(flags & CASE_SENSITIVE))
			reFlags += 'i';

		let backtrack = !(flags & NO_BACKTRACK);

		let re = new RegExp(pattern, reFlags), res = null;
		do {
			res = re.exec(data);
			if(res) {
				tMatches.push({
					tParts: res.filter(k => !(k in ['input', 'index'])),
					start:	res.index,
					end:	re.lastIndex,
				});
				if(backtrack)
					re.lastIndex = res.index + 1;
			}
		} while(res !== null);
		// });
		// console.log('Count: %d', tMatches.length);
		//
		// console.log(tMatches.slice(0, 2));

		// if(t.timers && t.timers.fn)
		// 	t.timers.fn.printResults();

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
