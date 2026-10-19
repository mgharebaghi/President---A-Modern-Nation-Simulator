# Development status

Updated: 2026-10-19 (Asia/Tehran).

- Latest completed phase: phase 01 implementation is complete; merge is authorized conditional on successful latest-head checks. Consult PR #1 for live merge state.
- Active approved phase: **01 — foundation**, authorized in chat on 2026-10-19. Rust may be used where measured speed/size benefits justify it.
- Branch: `phase/01-foundation`; base: `main` at `f6e2391284ab59cf026b5650e69959e5213dda32`.
- PR: [#1](https://github.com/mgharebaghi/President---A-Modern-Nation-Simulator/pull/1), opened as draft while documentation/CI are finalized. Consult the live PR for its current readiness state.
- Latest related implementation commit: `6d8d2be` (phase 01 visual feedback and low-FPS camera easing); earlier test fix: `6ae006b`. Run `git log` for later documentation commits; a commit cannot embed its own SHA.
- Local checks: lint, TypeScript, 28 unit tests, build and all 3 Chromium interaction scenarios pass. A concurrent software-renderer run exceeded the old 30-second per-test timeout; an isolated run with the documented 60-second budget passed all checks without removing assertions.
- Hardware baseline: 60 FPS in all six samples per quality on RTX 3070 Laptop / D3D11 at a 1920×1080 browser viewport, 1412×743 scene canvas, static daytime. Initial page JS heap ~19–22 MiB; refined scene ~24–26 MiB. Integrated GPU and total GPU/process memory unmeasured. Full before/after method and raw data: `docs/PERFORMANCE.md`.
- CI: PR [#1 checks](https://github.com/mgharebaghi/President---A-Modern-Nation-Simulator/pull/1/checks) are the live reference. Run 39277699149 passed lint/typecheck/28 unit tests/build and the first two browser scenarios, then exposed a race in the night test: slow software-renderer actionability let a 6× clock reach morning before Pause. The scenario now runs at normal speed, observes night explicitly, and verifies the stopped hour/light state plus no further advancement, rather than assuming Pause happened in the earlier observed hour. Final-head rerun is pending at this documentation checkpoint; readiness is recorded on the PR after verification, avoiding a self-updating status-commit loop.
- Human feedback: owner requested more natural graphics, then responded positively and explicitly authorized merging every completed phase when checks pass (2026-10-19). That standing approval supersedes the original per-merge confirmation rule. Do not invent additional human test coverage. Starting phase 02 is still not authorized.

## Implemented

Independent worker clock and contracts, Gregorian/Persian calendar, English/Persian interface, procedural capital district, camera and selection, day/night, quality settings, actual render statistics, guide, error messages and cleanup. No Rust runtime shipped because phase 01 has no heavy simulation workload.

Visual feedback revision: deterministic local surface/sky textures, environment reflections, roughness/metalness, balconies/entrances/parapets, clustered foliage, both river banks/terrain/surrounding blocks, PCF/contact shadows, street light pools and two unshadowed palace lamps. GPU remeasurement: 60 FPS in six static daytime samples per quality, 125 high-quality draw calls / 96,706 triangles, ~24–26 MiB page JS heap. See `docs/PERFORMANCE.md` for both before/after data and limitations. Updated day/night/mobile screenshots are in `docs/screenshots/`.

Visual revision checks: lint/typecheck/28 unit tests/build pass. Mobile and night browser scenarios pass. A final software-renderer run exposed camera reset taking too long because presentation delta was capped at 100ms; changed the easing bound to one second of real elapsed time and reran the full capital/camera/bilingual/clock/quality scenario successfully (32.7s). No assertion was removed or timeout increased for that fix. CI must still be checked on the latest pushed visual-revision head.

## Open work at this checkpoint

Push the standing-merge-policy update, inspect CI on the latest head, mark PR ready and merge that checked head once all relevant checks pass; verify remote/local main afterward. Local Vite preview was verified at `http://127.0.0.1:5173`; restart with the README command if the session has ended. Do not start phase 02 without separate owner authorization. Live PR/checks remain the source of truth for completion.

## Known limitations

- Economy/politics/national selection/save games/active traffic are outside phase 01.
- Save state is not persisted; language alone is stored locally. A refresh restarts the scenario.
- Sun cycle is hourly and stylized. Background catch-up is intentionally disabled.
- CI uses SwiftShader; it verifies behavior, not hardware FPS. Hardware targets are aspirational until measured on the stated device classes.
- No online preview is provisioned. A local Vite session or CI build artifact is not a published URL.
- Chromium is the automated browser target in this phase. Firefox/WebKit and owner device acceptance remain future checks.
- Asset model is procedural; final high-fidelity asset work will accompany approved scene expansion.

## Continuation

Verify `git status`, current branch, `git log`, PR state, current checks and new owner feedback. See architecture, roadmap, performance report and manual test guide. Standing approval now covers merging completed phases after successful latest-head checks; do not ask for merge approval again unless the owner changes this instruction. Verify `main` after merge and request separate phase 02 authorization before beginning it.
