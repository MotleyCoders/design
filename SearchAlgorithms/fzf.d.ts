/**
 * These definitions are here for proper type completion for complex types
 */

export namespace fzf {

	interface Match {
		/** - The full match of the pattern from the input */
		match: string;

		/** The index into the unaltered data this match begins at */
		start: number;

		/** The index into the unaltered data this match ends at */
		end: number;

		/** The final score of this match against the data */
		score: number;
	}

	interface MatchMetaData {
		/** The original item data in UPPER/Original/lowercase formats - Optimized conversion location */
		DATA: string;
		Data: string;
		data: string;

		/** The original user input in UPPER/Original/lowercase formats - Optimized conversion location */
		INPUT: string;
		Input: string;
		input: string;
	}
}
