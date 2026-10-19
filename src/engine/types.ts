/** Serializable boundary. UI and renderer must never mutate the simulation. */
export type GameSpeed = 1 | 6 | 24;
export type Account = 'treasury' | 'private' | 'contractor' | 'services' | 'utility';
export type TransferKind = 'tax' | 'services' | 'construction' | 'maintenance';
export interface Transfer { hour: number; kind: TransferKind; from: Account; to: Account; amount: number }
export interface Finance {
  accounts: Record<Account, number>;
  income: number;
  expenditure: number;
  unpaid: number;
  /** Most recent 30 transfers. Cumulative totals and counterpart balances retain the full accounting. */
  ledger: Transfer[];
}
export interface PowerProject { startedAt: number | null; completedAt: number | null }
export interface WorldState {
  readonly schemaVersion: 2;
  readonly scenarioId: 'mehran-capital';
  readonly seed: number;
  readonly elapsedHours: number;
  readonly speed: GameSpeed;
  readonly paused: boolean;
  readonly suspended: boolean;
  readonly revision: number;
  readonly finance: Finance;
  readonly power: PowerProject;
}
export type PlayerCommand =
  | { type: 'set-paused'; paused: boolean }
  | { type: 'set-speed'; speed: GameSpeed }
  | { type: 'build-power' };
export interface SimulationEvent {
  type: 'clock-control-changed' | 'project-started';
  elapsedHours: number; revision: number; command: PlayerCommand;
}
export interface SaveGame {
  format: 'president-save'; version: 1; world: WorldState; pendingHours: number;
}
export type EngineRequest =
  | { type: 'command'; command: PlayerCommand }
  | { type: 'visibility'; hidden: boolean }
  | { type: 'save'; id: number }
  | { type: 'load'; id: number; save: unknown };
export type EngineResponse =
  | { type: 'snapshot'; state: WorldState; events: SimulationEvent[] }
  | { type: 'saved'; id: number; save: SaveGame }
  | { type: 'loaded'; id: number }
  | { type: 'error'; code: 'invalid-command' | 'invalid-save'; id?: number };
/** Future Rust/WASM kernels implement this boundary inside the same worker. */
export interface SimulationKernel {
  snapshot(): WorldState;
  command(command: unknown): SimulationEvent[];
  advance(realSeconds: number): void;
  suspend(hidden: boolean): void;
  save(): SaveGame;
  load(value: unknown): void;
}
