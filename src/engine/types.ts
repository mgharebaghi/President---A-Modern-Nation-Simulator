/** Serializable boundary. UI and renderer must never mutate the simulation. */
export type GameSpeed = 1 | 6 | 24;

export interface WorldState {
  readonly schemaVersion: 1;
  readonly scenarioId: 'mehran-capital';
  readonly seed: number;
  readonly elapsedHours: number;
  readonly speed: GameSpeed;
  readonly paused: boolean;
  readonly suspended: boolean;
  readonly revision: number;
}

export type PlayerCommand =
  | { type: 'set-paused'; paused: boolean }
  | { type: 'set-speed'; speed: GameSpeed };

export interface SimulationEvent {
  type: 'clock-control-changed';
  elapsedHours: number;
  revision: number;
  command: PlayerCommand;
}

export type EngineRequest =
  | { type: 'command'; command: PlayerCommand }
  | { type: 'visibility'; hidden: boolean };

export type EngineResponse =
  | { type: 'snapshot'; state: WorldState; events: SimulationEvent[] }
  | { type: 'error'; code: 'invalid-command' };

/** Future Rust/WASM kernels implement this boundary inside the same worker. */
export interface SimulationKernel {
  snapshot(): WorldState;
  command(command: unknown): SimulationEvent[];
  advance(realSeconds: number): void;
  suspend(hidden: boolean): void;
}
