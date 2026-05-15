/**
 * Utility functions for leap year and calendar calculations.
 * Can be used in both client and server contexts.
 */

export function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getTotalDaysInYear(year: number): number {
    return isLeapYear(year) ? 366 : 365;
}

export function getMissingDates(year: number, configuredDates: string[]): string[] {
    const totalDays = getTotalDaysInYear(year);
    const configured = new Set(configuredDates);
    const missing: string[] = [];

    const start = new Date(Date.UTC(year, 0, 1));
    for (let i = 0; i < totalDays; i++) {
        const d = new Date(start);
        d.setUTCDate(start.getUTCDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        if (!configured.has(dateStr)) {
            missing.push(dateStr);
        }
    }
    return missing;
}
