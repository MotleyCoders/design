'use strict';

/**
 * Note: regex_fzf is a modified implementation of the search algorithm in junegunn/fzf
 * @see https://github.com/junegunn/fzf/blob/master/src/algo/algo.go
 * @see regex_fzf.md
 */


const t	= require('exectimer');
const Tick = t.Tick;

/** @type {WinstonChalkyConsole} */
const log = require('../util/console');

const util									= require('util');
util.inspect.defaultOptions.colors			= true;
util.inspect.defaultOptions.depth			= 5;
util.inspect.defaultOptions.breakLength = 100;

// Temporary Usage
// noinspection JSUnusedLocalSymbols
let _, __;

const Logging = {
	Patterns:		false,
	SearchSummary:	false,
	ScoringSummary: false,
	ScoringDetail:	false,
};

const ScoreMatch			= 16;
const ScoreGapStart		= -3;
const ScoreGapExtention = -1;

// We prefer matches at the beginning of a word, but the bonus should not be
// too great to prevent the longer acronym matches from always winning over
// shorter fuzzy matches. The bonus point here was specifically chosen that
// the bonus is cancelled when the gap between the acronyms grows over
// 8 characters, which is approximately the average length of the words found
// in web2 dictionary and my file system.
const bonusBoundary = ScoreMatch / 2;

// Although bonus point for non-word characters is non-contextual, we need it
// for computing bonus points for consecutive chunks starting with a non-word
// character.
const bonusNonWord = ScoreMatch / 2;

// Edge-triggered bonus for matches in camelCase words.
// Compared to word-boundary case, they don't accompany single-character gaps
// (e.g. FooBar vs. foo-bar), so we deduct bonus point accordingly.
const bonusCamel123 = bonusBoundary + ScoreGapExtention;

// Minimum bonus point given to characters in consecutive chunks.
// Note that bonus points for consecutive matches shouldn't have needed if we
// used fixed match Score as in the original algorithm.
const bonusConsecutive = -(ScoreGapStart + ScoreGapExtention);

// The first character in the typed pattern usually has more significance
// than the rest so it's important that it appears at special positions where
// bonus points are given. e.g. "to-go" vs. "ongoing" on "og" or on "ogo".
// The amount of the extra bonus should be limited so that the gap penalty is
// still respected.
const bonusFirstCharMultiplier = 2;


const ScoreBase		= 16;
const Scoring			= {};
Scoring.Boundary		= ScoreBase / 3;
Scoring.Consecutive = ScoreBase / 2;
Scoring.Capitals		= ScoreBase;
Scoring.GapPenalty		= -ScoreBase / (ScoreBase);

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

/**
 * Creates, starts and returns a timer
 * @param {string} name
 * @return {Tick}
 */
function StartTimer(name) {
	let timer = new Tick(name);
	timer.start();
	return timer;
}

module.exports = new class Regex1Algorithm {
	constructor() {
	}

	/**
	 * @param {string} Data
	 * @param {string} Input
	 * @param {number} MaxMatches
	 */
	search(Data, Input, MaxMatches) {
		let TotalTimer = StartTimer('Total');

		let Inputs = Input.split(/\s+/);

		let MetaData = /** @var {FzMatchMetaData} */ {
			DATA: Data.toLocaleUpperCase(),
			Data: Data,
			data: Data.toLocaleLowerCase(),
		};


		/**
		 * Looking over the source for fzf, looks like its much simpler than _v1 tried/failed to do.
		 * @see fzf/src/algo header
		 * Going to attempt the same/similar with regex
		 */

		/** Get all line ending matches */
		let LineEnds = this.MatchAll('[\r\n]+', Data, NO_BACKTRACK);

		let ItemScores = Inputs
			.map((Input, InputIndex) => {
				MetaData.INPUT = Input.toLocaleUpperCase();
				MetaData.Input = Input;
				MetaData.input = Input.toLocaleLowerCase();

				let pattern = this.CreatePattern(Input),
					Matches;

				if(Logging.Patterns)
					log.section('Pattern: %s', pattern);

				// Tick.wrap(function fn(done) {

				// If our input pattern is not all lowercase, match case sensitively
				if(MetaData.Input !== MetaData.input)
					Matches = this.MatchAll(pattern, MetaData.Data, CASE_SENSITIVE);
				else
					Matches = this.MatchAll(pattern, MetaData.data);

				if(Logging.SearchSummary || Logging.ScoringSummary)
					log.section(`{yellow.bold %d matches} for "{bold.hex('#f0f') %s}"`, Matches.length, Input);

				// Matches = Matches.slice(0, 1);

				let LineEndsIter = this.GetLineEndsIterater(LineEnds);

				Matches
				// .sort((l, r) => l.match.length - r.match.length)
					.map((Match) => {
						Match.InputIndex = InputIndex;
						Match.ItemIndex = LineEndsIter.next(Match.end).value;
						return Match;
					})
					.map((Match) => this.Score(Match, MetaData))
				;
				if(Logging.SearchSummary || Logging.ScoringSummary)
					log.info('')
						.sectionEnd();	// Blank Line

				if(Logging.Patterns)
					log.sectionEnd();
				// log.info(Matches);

				// log.info('\n\n');
				// done();
				return Matches;
			})

			/** Group Raw Matches by ItemIndex : InputMatches */
			.reduce((acc, Matches) => {
				for(let Match of Matches) {
					let ItemMatch = acc[Match.ItemIndex] || {
						Score:			1,
						ItemIndex:		Match.ItemIndex,
						InputMatches: [],
					};

					ItemMatch.InputMatches[Match.InputIndex] = ItemMatch.InputMatches[Match.InputIndex] || [];
					ItemMatch.InputMatches[Match.InputIndex].push(Match);
					acc[Match.ItemIndex] = ItemMatch;
				}
				return acc;
			}, [])

			/** Sort Input Matches by Score and Calculate ItemMatch Score */
			.map((ItemMatch) => {
				for(let InputMatch of ItemMatch.InputMatches) {
					InputMatch.sort((a, b) => b.Score - a.Score);
					ItemMatch.Score = ItemMatch.Score * InputMatch[0].Score;
				}
				return ItemMatch;
			})
			.sort((a, b) => {
				return b.Score - a.Score;
			});

		// console.log(util.inspect(ItemScores));

		// if(Logging.SearchSummary)
		log.info('{grey Total Lines:} %d', LineEnds.length);

		// log.info(LineEnds);

		// for(let part of Inputs) {
		// 	log.info(part);
		// }

//		log.info(`searching with ${Input}`);

		if(TotalTimer)
			TotalTimer.stop();

		for(let name of Object.keys(t.timers)) {
			let res = t.timers[name];
			console.log('%s: %s', name, res.parse(res.duration()));
		}
	}

	GetLineEndsIterater(LineEnds) {
		function* LineEndsGenerator() {
			let pos = yield;
			let max = LineEnds.length;
			for(let i = 0; i < max; i++) {

				if(pos <= LineEnds[i].end) {
					i--;	// Go back one in case next match is in the same item
					pos = yield i + 1;
				}
			}
		}

		// Get a generator
		let gen = LineEndsGenerator();
		// Start the generator
		gen.next();
		// Return it, next call to gen.next(pos) will set value of ${let pos}
		return gen;
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
	 * @param {FzMatch} Match                The match structure to Score
	 * @param {FzMatchMetaData} MetaData        The current input/data state in various formats
	 */
	Score(Match, MetaData) {
		let at = 0;

		let [tParts, start, end] = Object.values(Match), {
			INPUT, Input, input,
			DATA, Data, data,
		}							= MetaData;

		if(Logging.ScoringSummary) {
		}

		/** @type {FzMatchClasses} */
		let Points = {
			Boundary:		0,
			Consecutive: 0,
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

				// log.info('  %d: "%s", at=%d', idx, match, at);

				// noinspection JSValidateTypes
				// if(Input == 'xxxxtse') {
				// 	log.info('      match[{yellow.bold %d}] = {yellow.bold %s}, input[{yellow.bold %d}] = {yellow.bold %s}, consecutive = {yellow.bold %d}', j, match[j],
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
				let prev = Match.tParts[idx - 1].length == 0,
					next = Match.tParts[idx + 1] !== undefined ? Match.tParts[idx + 1].length === 0 : false;

				if(prev || next) {
					Points.Consecutive++;
				}
				// console.debug('    {magenta Conseuctive Match}: "{green %s}" idx=%d, prev.l=%d, next.l=%d, match=%b',
				// 	match, idx, Match.tParts[idx - 1].length, Match.tParts[idx + 1] !== undefined ? Match.tParts[idx + 1].length : 9999);

				at += match.length;
			});

		if(end === Data.length || isBoundary(Data[end]))
			Points.Boundary += 1.5;		// Ending on Boundary Worth More

		if(Data[start - 1] === Data[end])
			Points.Boundary += 0.5;		// If the starting/ending boundary are the same character, slight bonus

		/** @type {FzMatchScores} */
		let Scores = {
			Boundary:		Points.Boundary * Scoring.Boundary,
			Consecutive: Points.Consecutive * Scoring.Consecutive,
			Capitals:		Points.Capitals * Scoring.Capitals,
			GapPenalty:		Points.GapLength * Scoring.GapPenalty,
		};

		Match.Points = Points;
		Match.Scores = Scores;

		Match.Score = Math.round(Object.values(Scores).reduce((acc, val) => acc + val, 0));

		if(Logging.ScoringSummary) {
			log.section('Scored {bold.hex("#f0f") %4d} for Item %4d: "{red %s}%s{red %s}" (%d-%d) ',
				Match.Score,
				Match.ItemIndex + 1,

				['\r', '\n', undefined].indexOf(Data[start - 1]) == -1 ? Data[start - 1] : '^',

				Match.tParts
					.slice(1)
					.map((v, i) =>
						i % 2 == 0
						? `{green.bold ${v}}`
						: `{rgb(150,150,150) ${v}}`,
					)
					.join(''),

				['\r', '\n', undefined].indexOf(Data[end]) == -1 ? Data[end] : '$',

				start, end,
			);
			if(Logging.ScoringDetail) {
				log.info('   Boundary: %6.1f = %4.1f * %2d', Scores.Boundary, Points.Boundary, Scoring.Boundary);
				log.info('Consecutive: %6.1f = %4.1f * %2d', Scores.Consecutive, Points.Consecutive, Scoring.Consecutive);
				log.info('   Capitals: %6.1f = %4.1f * %2d', Scores.Capitals, Points.Capitals, Scoring.Capitals);
				log.info('  GapLength: %6.1f = %4.1f * %2d', Scores.GapPenalty, Points.GapLength, Scoring.GapPenalty);
				log.info('');	// Blank Line
			}
			log.sectionEnd();
		}

		return Match;
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
	 * @returns {FzMatch[]}
	 */
	MatchAll(pattern, data, flags = 0) {
		let tMatches = [];

		// log.info('\n\n%s\n', pattern);

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
		// log.info('Count: %d', tMatches.length);
		//
		// log.info(tMatches.slice(0, 2));

		// if(t.timers && t.timers.fn)
		// 	t.timers.fn.printResults();

		return tMatches;
	}
}();


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
