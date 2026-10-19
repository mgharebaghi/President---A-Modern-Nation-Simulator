import { describe, expect, it } from 'vitest';
import { formatDate, formatTime, formatNumber } from './format';
import { messages } from './messages';

describe('bilingual presentation', () => {
  it('has a translation for every message in both languages', () => {
    expect(Object.keys(messages.fa).sort()).toEqual(Object.keys(messages.en).sort());
    for (const value of Object.values(messages.fa)) expect(value.trim().length).toBeGreaterThan(0);
  });
  it('formats the same instant with Gregorian and Persian calendars', () => {
    const instant = new Date('2026-01-01T08:00:00Z');
    expect(formatDate(instant, 'en')).toBe('1 January 2026');
    expect(formatDate(instant, 'fa')).toContain('۱۴۰۴');
    expect(formatDate(instant, 'fa')).toContain('دی');
    expect(formatTime(instant, 'en')).toBe('08:00');
    expect(formatTime(instant, 'fa')).toBe('۰۸:۰۰');
  });
  it('handles Nowruz and Persian year transitions', () => {
    expect(formatDate(new Date('2026-03-20T08:00:00Z'), 'fa')).toBe('۲۹ اسفند ۱۴۰۴');
    expect(formatDate(new Date('2026-03-21T08:00:00Z'), 'fa')).toBe('۱ فروردین ۱۴۰۵');
  });
  it('uses local digits', () => { expect(formatNumber(1234, 'fa')).toBe('۱٬۲۳۴'); });
});
