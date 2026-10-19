# PRESIDENT architecture

## Phase 01 boundaries

- `src/engine`: DOM-free TypeScript clock kernel, command validation, calendar and serializable contracts. `simulation.worker.ts` owns authoritative world state. React and Three.js cannot mutate it.
- `src/render`: Three.js scene and resource lifecycle. It consumes simulation hours and scene definitions; it never advances the simulation.
- `src/ui`: React interface, worker adapter, camera controls, settings and bilingual guide.
- `src/data`: authored, fictional capital landmarks and dimensions in scene meters. These are not live population or service statistics.
- `src/i18n`: complete English/Persian messages and UTC formatting using explicit Gregorian/Persian calendars. Simulation local time uses a fixed UTC representation; the computer timezone cannot change the world date.

Data flow: player control → typed worker request → validated command → kernel → snapshot/event → UI + renderer. Commands are applied synchronously within the worker. No AI executes in phase 01.

## Clock

The scenario begins paused at 2026-01-01 08:00. The simulation uses integer hours; controls select 1, 6 or 24 simulated hours per real second. Fractional scheduling time is accumulated without changing integer game time. Real elapsed time is settled before a command, preserving the previous speed up to that boundary. Rendering FPS is independent of clock advancement.

Hiding the tab sets a separate suspension flag. Visibility restoration resumes only if the player had not paused. Hidden time is not simulated. A delayed worker callback processes at most one real second to prevent background catch-up spikes. This deliberately favors responsiveness over wall-clock catch-up under severe browser stalls. No real-world/offline progression is promised.

Gregorian arithmetic uses JavaScript UTC dates; presentation uses `Intl.DateTimeFormat` with explicit calendar and UTC. Sunlight is a stylized hour-based cycle, not an astronomical or weather model. Every displayed hour has one lighting state; there is no independent cosmetic clock.

## Rendering

One WebGL2 renderer and one orbit controller are created per mounted scene and disposed on unmount. Windows, facade trim, trees and street furniture use instancing. Static boxes are batched by material and shadow behavior; selectable building bodies remain separate raycast targets. Repeated boxes share geometry and material instances. Shadow resolution is fixed at 2048; quality controls disable sun shadows on low and cap device pixel ratio at 1 / 1.3 / 1.7. Standard frustum culling remains enabled. External model loading and LOD assets are unnecessary for this small procedural district; introduce them as scene scale requires.

The district includes contemporary offices and residences, a civic palace, hospital, university, gardens, parked cars, a river and bridge. Cars are scenery; traffic, crowds and service capacities belong to later approved phases. Landmark shape illustrations in the inspector are UI icons, not purported model photographs.

Keyboard: tab to the canvas and use arrow keys to pan. Mouse: left drag orbit, right drag pan, wheel zoom. Touch: one finger orbit, two fingers zoom/pan. Landmark buttons provide keyboard access to building details. Focus/reset interpolate the camera; manual input cancels the movement. A lost WebGL context displays a localized reload prompt.

## Rust / WebAssembly decision

The owner explicitly authorizes Rust where it improves performance or size. Keep `SimulationKernel` as the internal adapter boundary. A future Rust implementation runs within the same worker; React, Three.js and wire contracts remain unchanged. Use batched numeric buffers for a measured hotspot rather than per-entity JS/WASM calls. Keep a TypeScript reference implementation for parity tests and deterministic regression scenarios.

Do not ship a Rust/WASM runtime merely for the current integer clock: no measured heavy simulation workload exists yet. Profile future production, trade, population and AI loops first. Adopt a kernel only after comparing representative JS and WASM end-to-end time, transfer/serialization cost, download size and memory. Record hardware, scene/world size, seeds, warm-up and percentiles. A Rust toolchain is not required to run phase 01. No Rust acceleration or performance win is claimed in this build.

## Next contracts

`WorldState`, `PlayerCommand`, `SimulationEvent`, `EngineRequest` and `EngineResponse` are internal versioned foundations, not a released mod API. Extend them in the owning phase. Phase 02 adds financial transactions, projects, capacity, versioned save serialization and IndexedDB. Subsequent systems must derive news, AI explanations and visual changes from real events. Do not add a backend, paid LLM dependency, multiplayer or a custom ECS without a separate need and scope review.
