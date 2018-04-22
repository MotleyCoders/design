/**
 * These definitions are here for upgraded console via winston
 */
import * as winston from "winston";

export interface WinstonChalkyConsole extends winston.LoggerInstance {

	/** The string that will be repeated for each indent level prefixing the output */
	indentStr: string;

	/** The current level of indenting that we are at */
	indentLevel: number;

	/** Logs the given message at the info level and increases indent */
	section(msg: string, ...args: any[]): this;

	/** Decreases indent */
	sectionEnd(): this;
}

export type T_WinstonChalkyConsole = WinstonChalkyConsole;
// export = WinstonChalkyConsole;

// export declare const console: WinstonChalkyConsole;
//

export const console: WinstonChalkyConsole;
