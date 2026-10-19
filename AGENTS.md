# Project working agreement

Read `docs/DEVELOPMENT_STATUS.md` and inspect actual Git state before continuing. The GitHub repository is the source of truth. The full owner brief is in `docs/PRODUCT_BRIEF.fa.md`.

- Only phase 01 is approved as of 2026-10-19. Do not start a later phase or expand scope without explicit owner approval.
- Use a separate branch and PR per phase, with small meaningful commits. Do not merge any PR without explicit owner approval, even when CI passes. Phase approval is not merge approval.
- Show a testable result as soon as an interaction works. Provide real local commands/verified URLs, expected behavior and limitations. Do not mark human testing approved without the owner's feedback.
- Preserve the simulation/UI/renderer boundary. No fabricated changing numbers or inert important controls. English and Persian RTL are required for every feature.
- Rust/WASM is allowed for measured hotspots; record evidence before adding runtime/toolchain complexity.
- Run `npm run check` and the relevant `npm run test:e2e` before review. Never remove a failing test to make CI pass. Keep measurements truthful, including renderer/hardware and memory limitations.
- Update status, README and the relevant architecture/roadmap/manual-test documents. Report real branch, commits, PR, checks, publication and remaining problems.
- Do not introduce paid services, expensive architecture changes or unrelated rewrites without discussing scope.
