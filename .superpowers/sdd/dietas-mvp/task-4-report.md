# Task 4 report — weekly editing and PDF reference

## Delivered

- `src/components/weekly-plan.tsx` renders seven dates from `startsOn`, grouped meal cards by moment, and controls to add, edit, and delete meals. A save replaces only the selected day's meal array through the `useDietStore` updater; other days and the existing plan object are not mutated. The week view also edits the plan name, week start, and daily water goal.
- `src/components/meal-form.tsx` provides labelled Spanish fields for moment, title, optional time/notes, and repeatable ingredient rows. Each row has name, category, optional positive quantity and unit, and a preparation action (Lavar, Cortar, Cocer, Preparar). It calls `validateMeal` and shows field-adjacent errors with `aria-invalid` and `aria-describedby`.
- `src/components/pdf-attachment.tsx` accepts only `File.type === 'application/pdf'` with a nonempty name and size at most 10 MiB. It retains and removes only `{ name, size }`, never PDF bytes or an object URL. The interface explains that the original file is not retained.
- `src/app/page.tsx` now renders `WeeklyPlan` in the Semana section. `src/app/globals.css` extends the existing leaf green/pale corn mobile-first design for the editor, ingredient rows, and attachment control.

## Interface ruling

The brief said to store the descriptor in plan notes, but `DietPlan` has no plan-level notes field. The parent approved an optional `attachment?: { name: string; size: number }` on `DietPlan`. `LocalPlanRepository` now validates its shape and 10 MiB limit and preserves it when saving/loading. Existing plans without an attachment remain valid. The repository test covers the valid round trip and rejection of a negative size.

## Test-first evidence and verification

Three component suites (seven assertions/scenarios) and the repository descriptor test were written before implementation. The prescribed RED command returned exit 127: `sh: line 1: vitest: command not found`. The external Vitest 3.2.7 runner collected the repository test and produced the intended behavioral RED: `round-trips only a valid PDF descriptor` failed because a negative descriptor did not throw. It could not collect the three component suites because `@testing-library/react` is absent from the workspace. Thus there is no claim of UI behavioral RED or GREEN.

After implementation:

```text
npm test -- src/components/weekly-plan.test.tsx src/components/meal-form.test.tsx src/components/pdf-attachment.test.tsx
exit 127: sh: line 1: vitest: command not found

external Vitest 3.2.7 runner, repository + meal validation + plan derivations
exit 0: 3 suites passed, 16 tests passed (repository: 7/7)

external Vitest 3.2.7 runner, all src tests
exit 1: 5 suites passed, 19 tests passed; 5 UI suites failed at import because @testing-library/react is unavailable, so 0 UI tests collected

external TypeScript 5 compiler against available React 19 declarations, Task 4 production sources and imports
exit 0: 0 diagnostics

external esbuild browser bundle of src/app/page.tsx
exit 0: 32.2 KB bundle created

React server-render shell smoke
exit 0: title, loading state, Semana navigation, and skip link present

npm run lint
exit 127: sh: line 1: eslint: command not found
```

The external compiler uses compatible React 19 declarations from another local project, not this project's declared installation. It checks production types but cannot substitute for the configured Next build. No packages were installed.

## Integration notes and remaining verification

- Task 5 can continue using `plan.days` and the existing shopping/preparation derivations. The new optional `plan.attachment` is descriptor metadata only and is not included in the share summary.
- Component tests should be rerun after project dependencies are available. The seven new UI cases cover labelled entry, field errors, quantity validation, seven-day rendering, preservation of other days, edit persistence, PDF validation, and removal. Browser interaction and a production Next build remain unverified here.
- No commit was made: `.git` is an empty, read-only directory, so this workspace is not a usable Git repository.

## Fix round 1 — review findings

The four findings in `task-4-review.md` were addressed:

1. Changing `Inicio de la semana` now calls `rebaseWeek`. Each saved day moves by its relative 0–6 index from the prior start date; stale dates outside that seven-day range fold to the same weekday in the new week, and colliding days merge their meal arrays. All meals remain in the visible seven days, so shopping/preparation derivations cannot continue reading hidden old-week days. The original plan is not mutated.
2. `isCalendarDate` checks actual calendar validity (including impossible month/day values) before date arithmetic. `safeWeekStart` uses the current local Monday if saved `startsOn` is invalid. Once the store has hydrated, the component persists a repaired start and rebased days; hydration is checked before this write so a saved plan is never overwritten by the provider's initial empty render.
3. Saving or cancelling restores focus to the add/edit button that opened the form. Deleting a meal moves focus to that day's heading, which is programmatically focusable.
4. Removing an ingredient row clears ingredient-indexed errors so messages cannot migrate onto the following row; unrelated title errors stay in place.

New tests were added before the fix. The runnable date suite produced RED before implementation (`Cannot find module './week-dates'`), then GREEN with 3/3 tests for rebasing, stale dates, and invalid calendar dates. Additional component regressions cover week-change persistence, invalid saved dates, focus restoration, and stale ingredient errors; they remain uncollected because UI dependencies are absent.

Verification after the fix:

```text
external Vitest 3.2.7: week-dates + repository + validation + derivations
exit 0: 4 suites passed, 19 tests passed

external Vitest 3.2.7: weekly-plan and meal-form UI suites
exit 1 before collection: Cannot find package '@testing-library/react'; 0 UI tests collected

npm test -- src/components/week-dates.test.ts src/components/weekly-plan.test.tsx src/components/meal-form.test.tsx
exit 127: sh: line 1: vitest: command not found

external TypeScript check of Task 4 production files and imports
exit 0: 0 diagnostics

external esbuild browser bundle of src/app/page.tsx
exit 0: 35.0 KB bundle created
```

No dependency installation or Git operation was performed.
