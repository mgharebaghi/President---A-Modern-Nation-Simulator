# Phase 01 human test

## Run

Node.js 24 and npm are required. From the repository root:

```powershell
npm ci
npm run dev -- --port 5173 --strictPort
```

Open the exact address printed by Vite (normally `http://127.0.0.1:5173`). This is a local server, not a public preview. The game needs a modern browser with WebGL2 and hardware acceleration.

## Inspect and interact

1. A fresh browser profile starts in Persian/RTL, at 08:00 on 11 Dey 1404 (1 January 2026), paused. There must be one city canvas and no fake economic counters.
2. Left-drag to orbit, right-drag to pan, scroll to zoom. Try zoom and reset buttons. Tab to the canvas and use arrow keys to pan. On touch, use one/two fingers.
3. Click a building body. Its name/type/dimensions appear with a selection outline. Select palace, hospital and university from the landmark list; use Focus to move the camera. On narrow screens open the building-details control first.
4. Resume time. Try 1, 6 and 24 game hours/second. Pause and verify the date stops. Observe sunrise, day, sunset, night and window lighting over a day; date and lighting must agree.
5. While running, switch to another browser tab for a few seconds. Return: there is no offline catch-up; the earlier running/paused intent is preserved.
6. Switch to English via EN. Direction, dates, numbers, guide, settings and building details change. Language survives a reload; game time resets in this phase.
7. Open Settings and change quality. Low disables sun shadows and lowers resolution. Observe actual FPS/draw calls/triangles, without interpreting software-renderer results as GPU benchmarks.
8. Open/close the guide and settings via buttons and Escape. Keyboard focus stays within an open modal and returns when closed.
9. At 390px width, ensure no horizontal page scrolling. Inspect the mobile building panel and time controls.
10. Visual feedback revision: zoom toward the offices and residences to inspect reflective glazing, tiled paving, balconies, door canopies and roof details. Orbit to see the continuous river banks and distant neighborhoods. At night, inspect the palace floodlighting and warm street pools. Confirm buildings still select correctly and quality/time/language controls work as before. This remains procedural, stylized realism rather than photographic asset fidelity.

## Limits

This is a foundation checkpoint, not the finished game. Only the fictional Darvan capital district exists. Economy, national selection, cabinet, diplomacy, population, saving and active traffic are not implemented. Parked cars and building types are scenery. Lighting follows hourly steps and is not astronomical. Refresh resets time; only language is stored. The north arrow rotates with camera bearing.

## Feedback

Report through the PR or this chat: browser/version, OS, screen size, quality setting, selected building, game date/speed, reproduction steps, expected/actual behavior, console error if any, and screenshot/video when useful. Human review remains pending until the owner actually tests and responds.

## Phase 02 acceptance

1. Run the README dev command, open the local address, and open Treasury & infrastructure. Start paused: 50,000,000 credits, 100/140 MW. Fund the plant: treasury 26,000,000, contractor 24,000,000. Funding again is disabled.
2. View the construction site. Resume at 24×: after 168 simulation hours (about seven real seconds without stalls), capacity becomes 180/140 MW, structure is complete and scaffolding disappears. Pausing/hidden tabs halt project time.
3. Open accounts and the transfer history. First midnight is 16 simulation hours after start. Daily taxes/services move cash between named accounts; the combined cash stays 250,000,000. Upkeep starts at a midnight on/after completion.
4. Save while partway through construction, refresh, and restore. Verify the same date, cash and remaining construction time; it starts paused. Resume to completion, save again, refresh and restore: capacity remains 180 MW, with no duplicate construction charge. Saving replaces the single local slot.
5. Switch English/Persian, inspect both numeral/date formats and the mobile layout. Try denying site storage: saving/restoring shows an error and gameplay remains usable.
6. Stop the manually started server with Ctrl+C. One-shot test/capture/measurement commands close their owned server/browser; verify no task-owned process remains.

No human acceptance is implied by automated success. Report actual observed behavior, browser, quality, language and reproduction steps.
