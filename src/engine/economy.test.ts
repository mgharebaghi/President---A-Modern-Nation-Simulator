import { describe, expect, it } from 'vitest';
import { ECONOMY, energyCapacity, POWER, powerProgress, TypeScriptKernel, validateSave } from './kernel';
import type { SaveGame } from './types';
function running() { const k = new TypeScriptKernel(); k.command({ type: 'set-paused', paused: false }); return k; }
function money(k: TypeScriptKernel) { return k.snapshot().finance; }
const total = (k: TypeScriptKernel) => Object.values(money(k).accounts).reduce((a, b) => a + b, 0);

describe('treasury and construction', () => {
  it('settles at local midnight, transfers actual funds and conserves money', () => {
    const k = running(); k.advance(15); expect(money(k).ledger).toHaveLength(0);
    k.advance(1); expect(money(k).accounts.treasury).toBe(50_120_000);
    expect(money(k).accounts.private).toBe(199_700_000);
    expect(money(k).accounts.services).toBe(180_000);
    expect(money(k).income - money(k).expenditure).toBe(120_000);
    expect(total(k)).toBe(250_000_000);
  });
  it('charges once, builds for exactly 168 simulation hours, then adds capacity and upkeep', () => {
    const k = running(); k.command({ type: 'build-power' });
    expect(money(k).accounts.treasury).toBe(26_000_000);
    expect(money(k).accounts.contractor).toBe(POWER.cost);
    expect(() => k.command({ type: 'build-power' })).toThrow();
    k.advance(167); expect(powerProgress(k.snapshot())).toBe(167 / 168); expect(energyCapacity(k.snapshot())).toBe(100);
    k.advance(1); expect(k.snapshot().power.completedAt).toBe(168); expect(energyCapacity(k.snapshot())).toBe(180);
    expect(money(k).accounts.utility).toBe(0);
    k.advance(16); expect(money(k).accounts.utility).toBe(ECONOMY.maintenance);
    expect(total(k)).toBe(250_000_000);
  });
  it('never creates tax money or negative cash after counterpart funds are depleted', () => {
    const k = running(); k.advance(24 * 2000);
    expect(money(k).accounts.private).toBe(0); expect(money(k).accounts.treasury).toBe(0);
    expect(money(k).unpaid).toBeGreaterThan(0); expect(money(k).ledger).toHaveLength(30);
    expect(Object.values(money(k).accounts).every(v => v >= 0)).toBe(true); expect(total(k)).toBe(250_000_000);
    const before = k.snapshot(); expect(() => k.command({ type: 'build-power' })).toThrow(); expect(k.snapshot()).toEqual(before);
  });
  it('keeps nested snapshots detached', () => {
    const k = running(); const copy = k.snapshot(); copy.finance.accounts.treasury = 0; copy.power.startedAt = 0;
    expect(money(k).accounts.treasury).toBe(50_000_000); expect(k.snapshot().power.startedAt).toBeNull();
  });
});
describe('versioned save replay', () => {
  it('continues the same construction, cash and fractional time after safe paused restore', () => {
    const original = running(); original.advance(4.25); original.command({ type: 'build-power' }); original.advance(81.25);
    const saved = JSON.parse(JSON.stringify(original.save())) as SaveGame;
    const loaded = new TypeScriptKernel(); loaded.load(saved);
    expect(loaded.snapshot().paused).toBe(true); loaded.advance(100); expect(loaded.snapshot().elapsedHours).toBe(85);
    loaded.command({ type: 'set-paused', paused: false });
    original.advance(100.5); loaded.advance(100.5);
    const a = original.snapshot(), b = loaded.snapshot();
    expect(a.elapsedHours).toBe(b.elapsedHours); expect(a.finance).toEqual(b.finance); expect(a.power).toEqual(b.power);
    expect(energyCapacity(b)).toBe(180); expect(loaded.save().pendingHours).toBe(original.save().pendingHours);
  });
  it.each(['version', 'cash', 'ledger', 'future-project', 'completion', 'delta', 'speed', 'seed'])('rejects corrupt %s atomically', field => {
    const k = running(); k.command({ type: 'build-power' }); k.advance(32);
    const save = k.save(); const before = k.snapshot();
    if (field === 'version') save.version = 99 as 1;
    if (field === 'cash') save.world.finance.accounts.treasury++;
    if (field === 'ledger') save.world.finance.ledger.pop();
    if (field === 'future-project') save.world.power.startedAt = 100;
    if (field === 'completion') save.world.power.completedAt = 1;
    if (field === 'delta') save.pendingHours = NaN;
    if (field === 'speed') (save.world as unknown as { speed: number }).speed = 2;
    if (field === 'seed') (save.world as unknown as { seed: number }).seed++;
    expect(() => k.load(save)).toThrow(); expect(k.snapshot()).toEqual(before);
  });
  it('validates a pristine initial save and preserves current hidden-tab suspension', () => {
    const k = new TypeScriptKernel(); const save = k.save(); expect(validateSave(save)).toEqual(save);
    k.suspend(true); k.load(save); expect(k.snapshot().suspended).toBe(true);
  });
});
