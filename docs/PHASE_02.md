# Phase 02 — Treasury, infrastructure and a saved campaign

The fictional Mehran scenario begins on 1 January 2026 at 08:00, paused. All monetary values are integer fictional credits; capacities are MW. These are authored scenario values, not estimates for a real country.

| Setting | Value |
| --- | ---: |
| Treasury / private funds at start | 50,000,000 / 200,000,000 credits |
| Daily tax / service budget | 300,000 / 180,000 credits |
| Power station construction | 24,000,000 credits, 168 simulation hours |
| Initial capacity / fixed demand | 100 / 140 MW |
| Capacity after completion | 180 MW |
| Plant upkeep, each midnight after completion | 20,000 credits |

## Causal loop

Funding transfers the full cost from treasury to contractor once. Construction starts at the command's settled integer simulation hour. Pausing or hiding the tab stops construction. At exactly start + 168 hours, the structure is complete and 80 MW capacity is added. Subsequent midnight settlements pay plant upkeep. The renderer receives the same project state: empty industrial lot → growing structure and scaffolding → finished plant without scaffolding. The project focus button moves to the east-bank site.

Midnight settlement collects tax from private funds, pays service providers and, if operational, the plant operator. Each payment is capped at the paying account's cash. No account is negative and the total across treasury, private sector, contractor, services and utility remains 250,000,000. The UI shows cumulative actual receipts, actual payments, unpaid scheduled expenditure and all account balances. The ledger retains the last 30 transfers; cumulative totals retain earlier cash flows. Private funds eventually run out: there is no hidden money creation, production loop, debt or replenishment in this deliberately small scenario. Unpaid spending accumulates; it does not yet simulate service quality or plant reliability. Demand is fixed; capacity is not delivered electricity. Full economic behavior belongs to later phases.

Completion is processed before settlement if it coincides with midnight. The scenario stops at a bounded 100-year horizon. All UI values, progress and account changes derive from worker state; the renderer cannot fund or complete a project.

## Save contract

Native IndexedDB database `president-saves`, version 1, store `slots`, key `current` contains one `{savedAt, game}` envelope. Save format `president-save` version 1 contains schema-2 world state and fractional simulation-hour accumulator. No prior phase had persisted games requiring migration. Unknown formats/versions are rejected without replacing the active world. Snapshot responses have request IDs and a timeout; success is shown only when the IndexedDB transaction commits. Database connections close on completion/error or version change.

Validation checks scenario, seed, bounds, clock controls, fractional time and project dates, then reconstructs economic history from elapsed hours and the project funding hour. Balances, cumulative totals, recent transfers and completion must match replay exactly. Invalid loads do not mutate the kernel. A restore keeps the current tab visibility, starts paused and retains fractional time; normal continuation matches uninterrupted accounting and completion. No offline advancement, autosave, multiple slots or cloud synchronization is included. Reload starts a fresh session; the player explicitly restores the local slot. Storage denial or corruption produces a localized recoverable message, while the clock/project remains usable. Saves are tied to browser profile and origin; `localhost` and `127.0.0.1` are distinct origins.

## Process ownership

Playwright starts its own strict-port Vite child and refuses to attach to another server. Preview capture and renderer measurement use `with-preview.mjs`, which starts a strict-port child on 5174 and closes it in `finally`; browsers likewise close in `finally`. Use foreground, one-shot tests and audit task-owned Node/Vite/browser descendants after execution. Do not kill unrelated Codex runtimes or a user's server. User-run `dev`, `preview` and `test:watch` remain intentionally interactive; stop those with Ctrl+C.
