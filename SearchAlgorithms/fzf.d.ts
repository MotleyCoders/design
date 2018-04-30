/**
 * These definitions are here for proper type completion for complex types
 */

declare interface FzMatchClassesCommon {
	/** Boundary Character Score */
	Boundary: number;

	/** Consecutive Characters Matched */
	Consecutive: number;

	/** Number of Uppercase Input matches to Data */
	Capitals: number;
}

declare interface FzMatchClasses extends FzMatchClassesCommon {
	/** Count of characters between input matches */
	GapLength: number;
}

declare interface FzMatchScores extends FzMatchClassesCommon {
	/** The penalty score for gaps in-between matching characters */
	GapPenalty: number;
}

declare interface FzMatch {
	/** The full match of the pattern from the input */
	tParts: string[];

	/** The index into the unaltered data this match begins at */
	start: number;

	/** The index into the unaltered data this match ends at */
	end: number;

	/** The final score of this match against the data */
	Score: number;

	/** The individual class points calculated for the match */
	Points: FzMatchClasses;

	/** The total scores per class calculated for the match */
	Scores: FzMatchScores;

	/** The line item data for the match */
	Item: FzMatchItem;
}

declare interface FzMatchItem {
	/** The 0 based line number of the match */
	Line: number;

	/** The 0 base start character of the match (from the raw data) */
	Start: number;

	/** The 0 base end character of the match (from the raw data) */
	End: number;
}

declare interface FzMatchMetaData {
	/** The original item data in UPPER/Original/lowercase formats - Optimized conversion location */
	DATA: string;
	Data: string;
	data: string;

	/** The original user input in UPPER/Original/lowercase formats - Optimized conversion location */
	INPUT: string;
	Input: string;
	input: string;
}

declare class FzMap<T> {
	[key: string]: T;
}
