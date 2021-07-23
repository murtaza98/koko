/**
 * Holds the one-on-one statistics
 */
export interface IStatsStorage {
    username1: string;
    username2: string;
    dateTime: Date;
}

export interface IMonthlyStatsStorage {
    [yearMonth: string]: Array<string>;
}
