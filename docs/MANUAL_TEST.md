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

## Limits

This is a foundation checkpoint, not the finished game. Only the fictional Darvan capital district exists. Economy, national selection, cabinet, diplomacy, population, saving and active traffic are not implemented. Parked cars and building types are scenery. Lighting follows hourly steps and is not astronomical. Refresh resets time; only language is stored. The north arrow rotates with camera bearing.

## Feedback

Report through the PR or this chat: browser/version, OS, screen size, quality setting, selected building, game date/speed, reproduction steps, expected/actual behavior, console error if any, and screenshot/video when useful. Human review remains pending until the owner actually tests and responds.
