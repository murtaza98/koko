/**
 * Holds the scores for receiving praise
 */
export interface IKarmaStorage {
    [username: string]: number;

}
/**
 * Holds the scores for giving praise
 */
 export interface IPraiserKarmaStorage {
    [username: string]: number;
}

/**
 * Holds the monthly praised
 */
 export interface IMonthlyKarmaStorage {
    [yearMonth: string]: Array<string>;
}

/**
 * Holds the monthly praisers
 */
 export interface IMonthlyPraiserKarmaStorage {
    [yearMonth: string]: Array<string>;
}
