import type { GameSpeed, PlayerCommand, SimulationEvent, SimulationKernel, WorldState } from './types';

export function initialWorld(): WorldState {
  return {
    schemaVersion: 1, scenarioId: 'mehran-capital', seed: 20260101,
    elapsedHours: 0, speed: 1, paused: true, suspended: false, revision: 0,
  };
}

export function validCommand(value: unknown): value is PlayerCommand {
  if (typeof value !== 'object' || value === null) return false;
  if (!('type' in value)) return false;
  if (value.type === 'set-paused') return 'paused' in value && typeof value.paused === 'boolean';
  return value.type === 'set-speed' && 'speed' in value && [1, 6, 24].includes(value.speed as number);
}

export class TypeScriptKernel implements SimulationKernel {
  private state = initialWorld();
  private pendingHours = 0;

  snapshot(): WorldState { return { ...this.state }; }

  command(command: unknown): SimulationEvent[] {
    if (!validCommand(command)) throw new TypeError('Invalid command');
    this.state = {
      ...this.state, revision: this.state.revision + 1,
      ...(command.type === 'set-paused' ? { paused: command.paused } : { speed: command.speed as GameSpeed }),
    };
    return [{ type: 'clock-control-changed', elapsedHours: this.state.elapsedHours, revision: this.state.revision, command }];
  }

  advance(realSeconds: number): void {
    if (!Number.isFinite(realSeconds) || realSeconds < 0) throw new RangeError('Invalid delta');
    if (this.state.paused || this.state.suspended) return;
    this.pendingHours += realSeconds * this.state.speed;
    const hours = Math.floor(this.pendingHours + 1e-9);
    this.pendingHours = Math.max(0, this.pendingHours - hours);
    if (hours) this.state = { ...this.state, elapsedHours: this.state.elapsedHours + hours, revision: this.state.revision + hours };
  }

  suspend(hidden: boolean): void { this.state = { ...this.state, suspended: hidden }; }
}
