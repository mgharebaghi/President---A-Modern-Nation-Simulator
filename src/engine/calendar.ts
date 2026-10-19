export const START_UTC = Date.UTC(2026, 0, 1, 8);
export const HOUR_MS = 3_600_000;

export function simulationDate(elapsedHours: number): Date {
  if (!Number.isSafeInteger(elapsedHours) || elapsedHours < 0) {
    throw new RangeError('Invalid simulation hour');
  }
  const date = new Date(START_UTC + elapsedHours * HOUR_MS);
  if (!Number.isFinite(date.getTime())) throw new RangeError('Calendar overflow');
  return date;
}

export function clockHour(elapsedHours: number): number {
  return simulationDate(elapsedHours).getUTCHours();
}
