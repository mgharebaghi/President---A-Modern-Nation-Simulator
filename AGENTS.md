# Project working agreement

Read `docs/DEVELOPMENT_STATUS.md` and inspect actual Git state before continuing. The GitHub repository is the source of truth. The full owner brief is in `docs/PRODUCT_BRIEF.fa.md`.

- Phase 02 (treasury, one power plant, save/resume) is approved as of 2026-10-19. Do not start a later phase or expand scope without explicit owner approval.
- Close every task-owned Node/server/browser process after testing and at handoff. Record a process baseline and verify cleanup; never kill unrelated processes.
- Use a separate branch and PR per phase, with small meaningful commits. On 2026-10-19 the owner gave standing approval to merge each completed phase once its latest-head checks pass. This supersedes the original per-merge confirmation rule in the preserved product brief. Verify relevant CI, inspect unresolved failures and merge the checked head without asking again. Starting a new phase still requires separate explicit owner approval.
- Show a testable result as soon as an interaction works. Provide real local commands/verified URLs, expected behavior and limitations. Do not mark human testing approved without the owner's feedback.
- Preserve the simulation/UI/renderer boundary. No fabricated changing numbers or inert important controls. English and Persian RTL are required for every feature.
- Rust/WASM is allowed for measured hotspots; record evidence before adding runtime/toolchain complexity.
- Run `npm run check` and the relevant `npm run test:e2e` before review. Never remove a failing test to make CI pass. Keep measurements truthful, including renderer/hardware and memory limitations.
- Update status, README and the relevant architecture/roadmap/manual-test documents. Report real branch, commits, PR, checks, publication and remaining problems.
- Do not introduce paid services, expensive architecture changes or unrelated rewrites without discussing scope.
