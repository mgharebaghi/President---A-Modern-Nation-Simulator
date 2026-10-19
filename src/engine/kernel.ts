import { clockHour } from './calendar';
import type { Finance, PlayerCommand, SaveGame, SimulationEvent, SimulationKernel, WorldState } from './types';

/** Authored phase-02 scenario values, in whole fictional Mehran credits and MW. */
export const ECONOMY = Object.freeze({ tax: 300_000, services: 180_000, maintenance: 20_000 });
export const POWER = Object.freeze({ cost: 24_000_000, hours: 168, capacity: 80, baseline: 100, demand: 140 });
// Bounded scenario horizon keeps imported saves and replay validation inexpensive.
export const MAX_HOURS = 24 * 365 * 100;
export function initialWorld(): WorldState {
  return {
    schemaVersion: 2, scenarioId: 'mehran-capital', seed: 20260101,
    elapsedHours: 0, speed: 1, paused: true, suspended: false, revision: 0,
    finance: { accounts: { treasury: 50_000_000, private: 200_000_000, contractor: 0, services: 0, utility: 0 }, income: 0, expenditure: 0, unpaid: 0, ledger: [] },
    power: { startedAt: null, completedAt: null },
  };
}
export function powerProgress(state: WorldState): number {
  return state.power.startedAt === null ? 0 : Math.min(1, (state.elapsedHours - state.power.startedAt) / POWER.hours);
}
export function energyCapacity(state: WorldState): number {
  return POWER.baseline + (state.power.completedAt === null ? 0 : POWER.capacity);
}
export function validCommand(value: unknown): value is PlayerCommand {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false;
  if (value.type === 'build-power') return true;
  if (value.type === 'set-paused') return 'paused' in value && typeof value.paused === 'boolean';
  return value.type === 'set-speed' && 'speed' in value && [1, 6, 24].includes(value.speed as number);
}
function transfer(finance: Finance, hour: number, kind: 'tax' | 'services' | 'construction' | 'maintenance', requested: number) {
  const from = kind === 'tax' ? 'private' : 'treasury';
  const to = kind === 'tax' ? 'treasury' : kind === 'construction' ? 'contractor' : kind === 'services' ? 'services' : 'utility';
  const amount = Math.min(requested, finance.accounts[from]);
  finance.accounts[from] -= amount;
  finance.accounts[to] += amount;
  if (kind === 'tax') finance.income += amount;
  else { finance.expenditure += amount; finance.unpaid += requested - amount; }
  finance.ledger.push({ hour, kind, from, to, amount });
  if (finance.ledger.length > 30) finance.ledger.shift();
}
export class TypeScriptKernel implements SimulationKernel {
  private state = initialWorld();
  private pendingHours = 0;
  snapshot(): WorldState { return structuredClone(this.state); }
  save(): SaveGame { return { format: 'president-save', version: 1, world: this.snapshot(), pendingHours: this.pendingHours }; }
  load(value: unknown): void {
    const save = validateSave(value);
    // Restores safely paused. Tab visibility is a property of this session, never the saved browser.
    this.state = { ...save.world, paused: true, suspended: this.state.suspended, revision: this.state.revision + 1 };
    this.pendingHours = save.pendingHours;
  }
  command(command: unknown): SimulationEvent[] {
    if (!validCommand(command)) throw new TypeError('Invalid command');
    if (command.type === 'set-paused' && !command.paused && this.state.elapsedHours === MAX_HOURS) throw new RangeError('Scenario complete');
    if (command.type === 'build-power') {
      if (this.state.power.startedAt !== null || this.state.finance.accounts.treasury < POWER.cost || this.state.elapsedHours + POWER.hours > MAX_HOURS) throw new RangeError('Cannot fund project');
      transfer(this.state.finance, this.state.elapsedHours, 'construction', POWER.cost);
      this.state = { ...this.state, power: { startedAt: this.state.elapsedHours, completedAt: null } };
    }
    this.state = {
      ...this.state, revision: this.state.revision + 1,
      ...(command.type === 'set-paused' ? { paused: command.paused } : command.type === 'set-speed' ? { speed: command.speed } : {}),
    };
    return [{ type: command.type === 'build-power' ? 'project-started' : 'clock-control-changed', elapsedHours: this.state.elapsedHours, revision: this.state.revision, command }];
  }
  advance(realSeconds: number): void {
    if (!Number.isFinite(realSeconds) || realSeconds < 0) throw new RangeError('Invalid delta');
    if (this.state.paused || this.state.suspended) return;
    this.pendingHours = Math.min(MAX_HOURS, this.pendingHours + realSeconds * this.state.speed);
    const hours = Math.min(MAX_HOURS - this.state.elapsedHours, Math.floor(this.pendingHours + 1e-9));
    this.pendingHours = Math.max(0, this.pendingHours - hours);
    this.advanceHours(hours);
    if (this.state.elapsedHours === MAX_HOURS) { this.pendingHours = 0; this.state = { ...this.state, paused: true }; }
  }
  private advanceHours(hours: number) {
    for (let i = 0; i < hours; i++) {
      const hour = this.state.elapsedHours + 1;
      const { startedAt, completedAt } = this.state.power;
      const complete = completedAt === null && startedAt !== null && hour >= startedAt + POWER.hours;
      this.state = { ...this.state, elapsedHours: hour, revision: this.state.revision + 1,
        power: complete ? { startedAt, completedAt: hour } : this.state.power };
      if (clockHour(hour) === 0) {
        transfer(this.state.finance, hour, 'tax', ECONOMY.tax);
        transfer(this.state.finance, hour, 'services', ECONOMY.services);
        if (this.state.power.completedAt !== null) transfer(this.state.finance, hour, 'maintenance', ECONOMY.maintenance);
      }
    }
  }
  /** Reconstruct economic state from a compact deterministic timeline, without trusting saved balances. */
  static replay(hours: number, startedAt: number | null): WorldState {
    const kernel = new TypeScriptKernel();
    if (startedAt !== null) {
      kernel.advanceHours(startedAt);
      kernel.command({ type: 'build-power' });
      kernel.advanceHours(hours - startedAt);
    } else kernel.advanceHours(hours);
    return kernel.snapshot();
  }
  suspend(hidden: boolean): void { this.state = { ...this.state, suspended: hidden }; }
}
function integer(value: unknown, max: number): value is number { return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= max; }
export function validateSave(value: unknown): SaveGame {
  if (!value || typeof value !== 'object') throw new TypeError('Invalid save');
  const candidate = value as SaveGame;
  const state = candidate.world;
  if (candidate.format !== 'president-save' || candidate.version !== 1 || !state || state.schemaVersion !== 2 || state.scenarioId !== 'mehran-capital' || state.seed !== 20260101 ||
    !integer(state.elapsedHours, MAX_HOURS) || !integer(state.revision, Number.MAX_SAFE_INTEGER - 1) || ![1, 6, 24].includes(state.speed) || typeof state.paused !== 'boolean' || typeof state.suspended !== 'boolean' ||
    !Number.isFinite(candidate.pendingHours) || candidate.pendingHours < 0 || candidate.pendingHours >= 1 || !state.power || !state.finance) throw new TypeError('Invalid save');
  const start = state.power.startedAt;
  if (start !== null && !integer(start, Math.min(state.elapsedHours, MAX_HOURS - POWER.hours))) throw new TypeError('Invalid project');
  const expected = TypeScriptKernel.replay(state.elapsedHours, start);
  // Exact economic replay also rejects forged money, missing/duplicate ledger rows and inconsistent completion.
  if (JSON.stringify(state.finance) !== JSON.stringify(expected.finance) || JSON.stringify(state.power) !== JSON.stringify(expected.power)) throw new TypeError('Invalid economy');
  return structuredClone(candidate);
}
