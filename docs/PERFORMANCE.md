# Phase 01 measured performance

Measured 2026-10-19. This is a small-scene baseline, not a claim about a completed nation simulator.

## Hardware baseline

- Windows 11 build 26300; AMD Ryzen 7 5800H; 28 GiB RAM reported by Node.
- Actual WebGL renderer: **ANGLE / NVIDIA GeForce RTX 3070 Laptop GPU / Direct3D11**. Chromium 156.0.8078.4, headless, explicitly requested D3D11; the driver identity was checked, not inferred from the installed GPU list.
- Browser viewport **1920×1080**, device pixel ratio 1. The visible canvas is **1412×743**, because the interface occupies the rest of the window. This is not a full-screen 1920×1080 canvas test.
- Default camera, paused at the initial daytime; development server, one benchmark browser, six approximately one-second statistics samples per quality after a 2.5-second warm-up.
- Scene source corresponds to `218975e`; the benchmark command is in `scripts/measure-render.mjs` and recorded with the phase's test tooling.

| Quality | Sampled FPS | Mean frame interval samples | Draw calls including shadows | Rendered triangles | Page JS heap at end |
| --- | --- | --- | --- | --- | --- |
| High | 60, 60, 60, 60, 60, 60 | 16.7 ms each | 114 | 57,724 | ~21 MiB |
| Medium | 60, 60, 60, 60, 60, 60 | 16.7 ms each | 114 | 57,724 | ~22 MiB |
| Low | 60, 60, 60, 60, 60, 60 | 16.6–16.7 ms | 66 | 50,664 | ~19 MiB |

Raw observations: [render-hardware.json](measurements/render-hardware.json). Heap samples are not garbage-collection-normalized; differences between quality settings do not prove memory savings. They exclude GPU allocations, worker heap and browser/process memory. Frame intervals are means from one-second windows, **not p95 or individual render CPU/GPU times**. The 60 FPS cap also does not measure spare GPU capacity.

At DPR 1, medium and high use the same resolution and shadows, so identical results are expected. At larger DPR their caps differ (1.3 versus 1.7). Low turns off sun shadows and caps DPR at 1. Static scenery is instanced by material/shadow behavior; selectable building bodies remain separate targets.

## Targets and limits

- Initial dedicated-GPU target: 60 FPS with this interface in a 1080p browser window. The recorded **static scene** meets that target on the tested RTX 3070 Laptop GPU.
- Integrated-GPU target: at least 30 FPS at low quality in a 720p browser window. **Not yet measured**; do not claim this target passes.
- Initial scene budgets: fewer than 150 draw calls at high/default view and fewer than 100,000 rendered triangles including shadows. Observed: 114 and 57,724.
- Initial page JS heap budget: under 128 MiB for the loaded district. Observed samples are ~19–22 MiB. Total process/GPU memory is not available from this measurement, so there is no verified total-memory result.
- Expanded cities, long sessions, high-DPR screens, camera motion under load, active gameplay and other browsers still require their own measurements. Human smoothness/visual acceptance remains pending.

Default headless Chromium initially chose **SwiftShader software rendering** despite installed GPUs. Diagnostic runs showed much lower FPS and included concurrent test/build activity; those are not controlled hardware benchmarks or evidence of a Rust-related bottleneck. CI explicitly uses SwiftShader for correctness and has no FPS gate. The hardware baseline above ran separately from browser tests.

The scene's renderer workload is not a reason to add Rust to the current clock kernel. Instancing addresses draw submission; future Rust/WASM work must profile actual numeric simulation workloads and include transfer/size costs.

## Build payload

Production build currently reports approximately 245 kB minified / 78 kB gzip for the main application, 578 kB / 145 kB gzip for the separately loaded Three.js city chunk, a 1.5 kB worker, and 19 kB / 5 kB gzip of CSS. Fonts are served locally as language subsets; only required font resources are fetched by the browser.

Vite emits its normal warning about the Three.js chunk exceeding 500 kB minified. The warning is retained, not hidden by raising its threshold. The chunk is loaded separately, and the total compressed payload is documented. A separate vendor chunk can improve repeat-visit caching later but would not itself reduce the library's bytes.

## Reproduce

Start the local server with `npm run dev -- --port 5173 --strictPort`, then:

```powershell
npm run measure:render -- --hardware  # Windows D3D11 request; inspect actual renderer
npm run measure:render               # default renderer; may be software
npm run measure:render -- --software  # explicitly software-rendered diagnostic
```

Run one browser benchmark at a time, without simultaneous e2e tests or builds. JSON is written under ignored `test-results/`; copy selected results into `docs/measurements/` only when reporting them with their actual method and limitations.
