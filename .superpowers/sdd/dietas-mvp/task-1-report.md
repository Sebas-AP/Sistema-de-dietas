# Task 1 report — project bootstrap and domain aggregation

## Scope and files

Created `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `src/test/setup.ts`, `src/domain/types.ts`, `src/domain/plan-derivations.ts`, and `src/domain/plan-derivations.test.ts`. Added `.superpowers/sdd/dietas-mvp/vitest-node.config.mjs` as a local verification fallback. No other source files were edited.

The manifest has the required `dev`, `build`, `lint`, `test`, `test:watch`, and `test:e2e` scripts and declares Next, React, TypeScript, Vitest, jsdom, Testing Library, ESLint, and Playwright. `vitest.config.ts` uses `jsdom`, `./src/test/setup.ts`, and the requested `src/**/*.test.{ts,tsx}` glob.

## TDD evidence

The three specified tests were written before `types.ts` and `plan-derivations.ts`. I added a fourth test for the global constraint that an ingredient with an unknown quantity remains visible without a fabricated zero; it was also written and run before production code.

The requested command was attempted for RED:

```text
$ npm test -- src/domain/plan-derivations.test.ts
> dietas@0.1.0 test
> vitest run src/domain/plan-derivations.test.ts
sh: line 1: vitest: command not found
exit 127
```

This is an installation failure, not a valid behavioral RED. A preinstalled Vitest 3.2.7 from `/home/sebastian/Proyectos/Sistema_Gorditas/node_modules` was used with a temporary Node environment config to exercise these pure domain tests. The effective RED, repeated after adding the fourth test, was:

```text
$ node /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/vitest/vitest.mjs run --config .superpowers/sdd/dietas-mvp/vitest-node.config.mjs src/domain/plan-derivations.test.ts
RUN  v3.2.7 /home/sebastian/Proyectos/Dietas
FAIL  src/domain/plan-derivations.test.ts
Error: Cannot find module './plan-derivations' imported from '/home/sebastian/Proyectos/Dietas/src/domain/plan-derivations.test.ts'
Test Files  1 failed (1)
Tests  no tests
exit 1
```

After creating the domain model and derivations, the same fallback command gave GREEN:

```text
$ node /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/vitest/vitest.mjs run --config .superpowers/sdd/dietas-mvp/vitest-node.config.mjs src/domain/plan-derivations.test.ts
RUN  v3.2.7 /home/sebastian/Proyectos/Dietas
✓ src/domain/plan-derivations.test.ts (4 tests) 34ms
Test Files  1 passed (1)
Tests  4 passed (4)
exit 0
```

The complete available suite under that fallback runner also passed: one file, four tests. A direct domain TypeScript check passed:

```text
$ /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/.bin/tsc --noEmit --noResolve --skipLibCheck --lib esnext,dom --target es2017 --module esnext src/domain/types.ts src/domain/plan-derivations.ts
exit 0
```

The requested `npm test -- src/domain/plan-derivations.test.ts` GREEN could not be observed. Retrying it after implementation still exited 127 with `sh: line 1: vitest: command not found`.

## Dependency installation blocker

`npm install --no-audit --no-fund` stalled with no output and was interrupted. A bounded retry, `npm install --no-audit --no-fund --fetch-retries=0 --fetch-timeout=10000`, failed with `EAI_AGAIN` resolving `registry.npmjs.org`. `npm install --offline --no-audit --no-fund` failed with `ENOTCACHED` for `@eslint/js`. No `node_modules` or lockfile was produced. Full Next build, project lint, and the configured jsdom test environment therefore remain unverified.

## Self-review

- Shopping keys include category, `trim().toLocaleLowerCase('es-MX')` name, and unit. Different units stay separate; the first trimmed display spelling remains visible.
- A quantity is summed only if both existing and incoming quantities are finite; an unknown or nonfinite quantity removes the aggregate quantity field. Rows without quantity or unit remain present.
- Shopping rows sort by category and then name with `localeCompare('es-MX')`.
- Preparation rows include only ingredients with a declared action and carry their consuming day date. Derived functions do not mutate the plan.
- The fallback runner changes only the test environment to Node and omits DOM setup, which is sufficient for pure domain tests but does not verify the requested jsdom configuration.
- The repository's `.git` is read-only and nonfunctional in this workspace. As explicitly directed, no git command or commit was attempted.

## Fix round 1 — collision-free shopping keys

Independent review identified that colon concatenation could map distinct `(category, normalized name, unit)` tuples to the same string. I added regression tests before changing production code: one with `A:B` / `C` versus `A` / `b:C`, and one with the same name/unit in different categories. The category test passed against the old behavior; the delimiter test produced an assertion RED:

```text
$ node /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/vitest/vitest.mjs run --config .superpowers/sdd/dietas-mvp/vitest-node.config.mjs src/domain/plan-derivations.test.ts
RUN  v3.2.7 /home/sebastian/Proyectos/Dietas
❯ src/domain/plan-derivations.test.ts (6 tests | 1 failed)
× does not combine different name and unit pairs containing delimiters
  → expected [ { key: 'protein:a:b:C', …(4) } ] to have a length of 2 but got 1
Test Files  1 failed (1)
Tests  1 failed | 5 passed (6)
exit 1
```

`buildShoppingList` now uses `JSON.stringify([category, normalizedName, unit])` as its stable string key. This encodes each tuple field separately, preventing delimiter collisions. The two existing tests with literal keys were updated to the new key format. Targeted GREEN:

```text
$ node /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/vitest/vitest.mjs run --config .superpowers/sdd/dietas-mvp/vitest-node.config.mjs src/domain/plan-derivations.test.ts
RUN  v3.2.7 /home/sebastian/Proyectos/Dietas
✓ src/domain/plan-derivations.test.ts (6 tests) 38ms
Test Files  1 passed (1)
Tests  6 passed (6)
exit 0
```

The complete available fallback suite passed (one file, six tests), and the direct domain TypeScript check passed:

```text
$ node /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/vitest/vitest.mjs run --config .superpowers/sdd/dietas-mvp/vitest-node.config.mjs
✓ src/domain/plan-derivations.test.ts (6 tests) 37ms
Test Files  1 passed (1)
Tests  6 passed (6)
exit 0

$ /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/.bin/tsc --noEmit --noResolve --skipLibCheck --lib esnext,dom --target es2017 --module esnext src/domain/types.ts src/domain/plan-derivations.ts
exit 0
```

Self-review: tuple serialization is deterministic for these three string fields; normalization and sorting are unchanged. Different categories remain distinct. This fix changed only `src/domain/plan-derivations.ts`, its test, and this report. The npm registry/pipeline blocker described above remains unresolved; no dependency installation or git command was attempted in this round.
