/**
 * These definitions are here for upgraded console via winston
 */
import * as winston from "winston";

export interface WinstonChalkyConsole extends winston.LoggerInstance {

}

export type T_WinstonChalkyConsole = WinstonChalkyConsole;
// export = WinstonChalkyConsole;

// export declare const console: WinstonChalkyConsole;
//

export const console: WinstonChalkyConsole;
