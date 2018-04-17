/**
 * These definitions are here for proper type completion for complex types
 */

declare interface MatchClassesCommon {
	/** Boundary Character Score */
	Boundary: number;

	/** Consecutive Characters Matched */
	Consecutive: number;

	/** Number of Uppercase Input matches to Data */
	Capitals: number;
}

declare interface MatchClasses extends MatchClassesCommon {
	/** Count of characters between input matches */
	GapLength: number;
}

declare interface MatchScores extends MatchClassesCommon {
	/** The penalty score for gaps in-between matching characters */
	GapPenalty: number;
}

declare interface Match {
	/** The full match of the pattern from the input */
	tParts: string[];

	/** The index into the unaltered data this match begins at */
	start: number;

	/** The index into the unaltered data this match ends at */
	end: number;

	/** The final score of this match against the data */
	score: number;

	/** The individual class points calculated for the match */
	Points: MatchClasses;

	/** The total scores per class calculated for the match */
	Scores: MatchScores;
}

declare interface MatchMetaData {
	/** The original item data in UPPER/Original/lowercase formats - Optimized conversion location */
	DATA: string;
	Data: string;
	data: string;

	/** The original user input in UPPER/Original/lowercase formats - Optimized conversion location */
	INPUT: string;
	Input: string;
	input: string;
}
