# Vitest runtime repair

## Cause and change

- `tsconfig.json` preserves JSX for Next.js, while Vitest was compiling test JSX with the classic React transform. Added `esbuild.jsx: 'automatic'` in `vitest.config.ts`.
- Node v26 exposes a `localStorage` global whose value is `undefined` without Node storage configuration. Vitest leaves that pre-existing global in place when it mounts JSDOM. `src/test/setup.ts` now exposes the `localStorage` from Vitest's JSDOM instance.
- Testing Library was not automatically cleaning rendered DOM between tests because Vitest globals are disabled. Added `afterEach(cleanup)` to the same setup file.
- Added `src/test/runtime.test.tsx` to cover automatic JSX compilation and access to JSDOM's actual `localStorage`.

## Verification

- Before the fixes, both new runtime tests failed with `React is not defined` and `Cannot read properties of undefined (reading 'setItem')`.
- After the JSX change alone, JSX passed and storage still failed. A JSDOM URL change did not address storage and was removed.
- Before shared cleanup, `app-navigation.test.tsx` had 2 failures from duplicate DOM nodes. With cleanup, focused navigation/runtime/state tests pass: 10/10 across 3 files.
- `npx tsc --noEmit`: pass.
- `npm run lint`: pass.
- Bare `npm test`: 53 passed, 7 failed, 16 files total (13 passed, 3 failed). The remaining failures are UI test queries rather than runtime failures:
  - `src/components/pdf-attachment.test.tsx`: 2 ambiguous `PDF de referencia` label queries.
  - `src/components/today-view.test.tsx`: 3 queries for `Próxima comida: HH:MM` fail because the time is nested in a `<time>` element.
  - `src/components/weekly-plan.test.tsx`: 2 ambiguous text queries (`PDF de referencia`, `Avena`).

No application code was changed. No git commands were used.
