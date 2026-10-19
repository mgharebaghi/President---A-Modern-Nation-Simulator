import { describe, expect, it } from 'vitest';
import { TypeScriptKernel, validCommand } from './kernel';
import { simulationDate, clockHour } from './calendar';
import type { GameSpeed } from './types';

describe('simulation clock', () => {
  it('starts paused at the agreed modern date', () => {
    const kernel = new TypeScriptKernel();
    kernel.advance(20);
    expect(kernel.snapshot().elapsedHours).toBe(0);
    expect(simulationDate(0).toISOString()).toBe('2026-01-01T08:00:00.000Z');
  });
  it.each([1, 6, 24] as GameSpeed[])('advances at %i game hours / second', speed => {
    const kernel = new TypeScriptKernel();
    kernel.command({ type: 'set-speed', speed });
    kernel.command({ type: 'set-paused', paused: false });
    kernel.advance(2);
    expect(kernel.snapshot().elapsedHours).toBe(speed * 2);
  });
  it('gives identical state for the same commands regardless of scheduler granularity', () => {
    const one = new TypeScriptKernel(), many = new TypeScriptKernel();
    for (const kernel of [one, many]) {
      kernel.command({ type: 'set-speed', speed: 24 });
      kernel.command({ type: 'set-paused', paused: false });
    }
    one.advance(100);
    for (let i = 0; i < 1000; i++) many.advance(0.1);
    expect(many.snapshot()).toEqual(one.snapshot());
  });
  it('preserves fractional time across pauses and speed changes', () => {
    const kernel = new TypeScriptKernel();
    kernel.command({ type: 'set-paused', paused: false });
    kernel.advance(0.5);
    kernel.command({ type: 'set-paused', paused: true });
    kernel.advance(10);
    kernel.command({ type: 'set-speed', speed: 6 });
    kernel.command({ type: 'set-paused', paused: false });
    kernel.advance(0.25);
    expect(kernel.snapshot().elapsedHours).toBe(2);
  });
  it('suspends a hidden tab without overriding player pause intent', () => {
    const kernel = new TypeScriptKernel();
    kernel.command({ type: 'set-paused', paused: false });
    kernel.suspend(true); kernel.advance(100);
    expect(kernel.snapshot().elapsedHours).toBe(0);
    expect(kernel.snapshot().paused).toBe(false);
    kernel.suspend(false); kernel.advance(1);
    expect(kernel.snapshot().elapsedHours).toBe(1);
    kernel.command({ type: 'set-paused', paused: true });
    kernel.suspend(true); kernel.suspend(false); kernel.advance(5);
    expect(kernel.snapshot().elapsedHours).toBe(1);
  });
  it('rejects invalid commands without corrupting state', () => {
    const kernel = new TypeScriptKernel();
    const before = kernel.snapshot();
    for (const invalid of [null, {}, { type: 'set-speed', speed: 7 }, { type: 'set-speed', speed: '6' }, { type: 'set-paused', paused: 1 }]) {
      expect(validCommand(invalid)).toBe(false);
      expect(() => kernel.command(invalid)).toThrow();
    }
    expect(kernel.snapshot()).toEqual(before);
  });
  it('records real command events with simulation timestamps', () => {
    const kernel = new TypeScriptKernel();
    kernel.command({ type: 'set-paused', paused: false }); kernel.advance(10);
    expect(kernel.command({ type: 'set-paused', paused: true })).toEqual([{
      type: 'clock-control-changed', elapsedHours: 10, revision: 12, command: { type: 'set-paused', paused: true },
    }]);
  });
  it('returns detached snapshots', () => {
    const kernel = new TypeScriptKernel();
    expect(kernel.snapshot()).not.toBe(kernel.snapshot());
  });
  it.each([NaN, Infinity, -1])('rejects invalid wall time %s', delta => {
    expect(() => new TypeScriptKernel().advance(delta)).toThrow(RangeError);
  });
});

describe('Gregorian calendar', () => {
  it.each([
    [Date.UTC(2026, 1, 1), '2026-02-01T00:00:00.000Z'],
    [Date.UTC(2027, 0, 1), '2027-01-01T00:00:00.000Z'],
    [Date.UTC(2028, 1, 29), '2028-02-29T00:00:00.000Z'],
    [Date.UTC(2028, 2, 1), '2028-03-01T00:00:00.000Z'],
    [Date.UTC(2100, 2, 1), '2100-03-01T00:00:00.000Z'],
  ])('handles month and leap-year boundaries %s', (timestamp, expected) => {
    const hours = (timestamp - Date.UTC(2026, 0, 1, 8)) / 3_600_000;
    expect(simulationDate(hours).toISOString()).toBe(expected);
  });
  it('wraps local hour at midnight', () => { expect(clockHour(15)).toBe(23); expect(clockHour(16)).toBe(0); });
  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid date %s', hours => {
    expect(() => simulationDate(hours)).toThrow(RangeError);
  });
});
