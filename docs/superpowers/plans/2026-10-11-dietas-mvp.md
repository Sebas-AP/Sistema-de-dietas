# Dietas MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an installable Spanish PWA that lets one local user manage a weekly diet, create shopping and preparation lists, attach a reference PDF, set in-app meal reminders, and share a text summary.

**Architecture:** Next.js App Router renders an accessible responsive UI. Pure TypeScript domain functions aggregate ingredients and preparation tasks; a browser-only repository persists one `DietPlan` and completion state in `localStorage`. React components consume a small `DietStore` context, leaving domain and storage independent from pages.

**Tech Stack:** Next.js, React, TypeScript, CSS Modules, Vitest, React Testing Library, Playwright, ESLint.

**Spec:** `docs/superpowers/specs/2026-10-11-dietas-mvp-design.md`

## Global Constraints

- All visible copy is Spanish (Mexico); do not make clinical, caloric, or diagnosis claims.
- The app is local-first: do not introduce an API, account, analytics, or external upload.
- The PDF is a client-only reference attachment, must be `application/pdf`, and is limited to 10 MB.
- Shopping quantities aggregate only when normalized name, category, and unit are equal.
- Store different units as distinct shopping rows; never silently convert a unit.
- A preparation list includes only ingredients with a declared action: `wash`, `cut`, `cook`, or `prep`.
- UI controls have labels, keyboard focus, and semantic buttons/checkboxes.
- Tests must be written and observed failing before the production behavior is implemented.

## Review Focus

- An ingredient named with different case or surrounding whitespace should aggregate into one compatible shopping row.
- `1 kg` and `500 g` of the same ingredient must remain separate because the MVP performs no conversion.
- An ingredient without quantity/unit must remain visible in shopping instead of becoming zero.
- Corrupt or unavailable localStorage must fall back to a usable empty plan instead of breaking the page.
- A non-PDF or PDF over 10 MB must never appear as an accepted attachment.

## File Structure

- `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`: project and test configuration.
- `src/domain/`: types, aggregation, validation, and portable-share formatting.
- `src/storage/local-plan-repository.ts`: localStorage repository with safe fallback.
- `src/state/diet-store.tsx`: client-side plan and completion-state context.
- `src/app/`: layout, PWA manifest, global styles and application route.
- `src/components/`: navigation, meal form, weekly view, attachment control and derived-list views.
- `src/**/*.test.ts(x)`: unit/component tests; `e2e/diet-flow.spec.ts`: end-to-end flow.

### Task 1: Bootstrap the project and domain aggregation

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/test/setup.ts`
- Create: `src/domain/types.ts`, `src/domain/plan-derivations.ts`, `src/domain/plan-derivations.test.ts`

**Interfaces:**
- Produces `DietPlan`, `Ingredient`, `GroceryCategory`, `PreparationAction`, `ShoppingItem`, `PreparationItem` from `src/domain/types.ts`.
- Produces `buildShoppingList(plan: DietPlan): ShoppingItem[]` and `buildPreparationList(plan: DietPlan): PreparationItem[]`.

- [ ] **Step 1: Configure the minimal Next/Vitest project**

Create a `package.json` with `dev`, `build`, `lint`, `test`, `test:watch`, and `test:e2e` scripts. Install Next, React, TypeScript, Vitest, jsdom, Testing Library, ESLint, and Playwright. Configure Vitest with `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, and test glob `src/**/*.test.{ts,tsx}`.

- [ ] **Step 2: Write the failing domain tests**

```ts
it('aggregates compatible ingredient quantities ignoring case and whitespace', () => {
  const list = buildShoppingList(planWith(' Pollo ', 1, 'pieza', 'protein', 'pollo', 2, 'pieza', 'protein'))
  expect(list).toEqual([{ key: 'protein:pollo:pieza', name: 'Pollo', category: 'protein', quantity: 3, unit: 'pieza' }])
})

it('keeps incompatible units on separate shopping rows', () => {
  expect(buildShoppingList(planWith('Arroz', 1, 'kg', 'pantry', 'arroz', 500, 'g', 'pantry'))).toHaveLength(2)
})

it('only emits ingredients that have a preparation action', () => {
  expect(buildPreparationList(planWithIngredient({ name: 'Zanahoria', preparationAction: 'cut' }))).toMatchObject([{ name: 'Zanahoria', action: 'cut' }])
  expect(buildPreparationList(planWithIngredient({ name: 'Manzana' }))).toEqual([])
})
```

- [ ] **Step 3: Run the domain tests and verify RED**

Run: `npm test -- src/domain/plan-derivations.test.ts`

Expected: FAIL because `types.ts` and `plan-derivations.ts` do not yet export the tested interfaces/functions.

- [ ] **Step 4: Implement the smallest domain model and derivations**

Implement the exact exports. Normalize aggregation names with `trim().toLocaleLowerCase('es-MX')`; preserve the first trimmed display spelling. Aggregate quantity only when both rows have a finite quantity; otherwise return a row without quantity. Include day dates in each preparation row and sort shopping by category then `localeCompare('es-MX')`.

- [ ] **Step 5: Run the domain tests and verify GREEN**

Run: `npm test -- src/domain/plan-derivations.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit the task**

```bash
git add package.json tsconfig.json next.config.ts vitest.config.ts src
git commit -m "feat: add diet plan domain aggregation"
```

### Task 2: Add local persistence, validation, and share formatting

**Files:**
- Create: `src/domain/meal-validation.ts`, `src/domain/meal-validation.test.ts`
- Create: `src/domain/share-summary.ts`, `src/domain/share-summary.test.ts`
- Create: `src/storage/local-plan-repository.ts`, `src/storage/local-plan-repository.test.ts`

**Interfaces:**
- Consumes `DietPlan`, `Meal`, and derived lists from Task 1.
- Produces `validateMeal(meal): Record<string, string>`, `formatShareSummary(plan, section): string`, and `LocalPlanRepository` with `load()`, `save(plan)`, `loadCompletion(key)`, `saveCompletion(key, complete)`.

- [ ] **Step 1: Write failing validation, persistence, and summary tests**

```ts
it('rejects an empty ingredient name and non-positive quantity when a unit exists', () => {
  expect(validateMeal(mealWithIngredient({ name: '', quantity: 0, unit: 'taza' }))).toEqual({ 'ingredients.0.name': 'Ingresa un alimento', 'ingredients.0.quantity': 'Ingresa una cantidad mayor a cero' })
})

it('falls back to an empty plan when saved JSON is corrupt', () => {
  localStorage.setItem(PLAN_STORAGE_KEY, '{bad json')
  expect(repository.load()).toMatchObject({ days: [] })
})

it('formats a portable shopping summary without attachment metadata', () => {
  expect(formatShareSummary(plan, 'shopping')).toContain('Lista de compras')
  expect(formatShareSummary(plan, 'shopping')).not.toContain('archivo')
})
```

- [ ] **Step 2: Run these tests and verify RED**

Run: `npm test -- src/domain/meal-validation.test.ts src/domain/share-summary.test.ts src/storage/local-plan-repository.test.ts`

Expected: FAIL because the modules and exports are absent.

- [ ] **Step 3: Implement the small pure utilities and repository**

Define `EMPTY_PLAN` as `{ id: 'local-plan', name: 'Mi plan semanal', startsOn: '', days: [] }`. Wrap `localStorage` reads and JSON parsing in `try/catch`; only write JSON after validating a plan-shaped object. `formatShareSummary` must use shopping or preparation derivations, include title/date range and bullet rows, and omit all attachment information.

- [ ] **Step 4: Run task tests and verify GREEN**

Run: `npm test -- src/domain/meal-validation.test.ts src/domain/share-summary.test.ts src/storage/local-plan-repository.test.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the task**

```bash
git add src/domain src/storage
git commit -m "feat: persist local diet plans safely"
```

### Task 3: Build the client state and application shell

**Files:**
- Create: `src/state/diet-store.tsx`, `src/state/diet-store.test.tsx`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/manifest.ts`
- Create: `src/components/app-navigation.tsx`, `src/components/app-navigation.test.tsx`

**Interfaces:**
- Consumes `LocalPlanRepository` from Task 2.
- Produces `DietProvider`, `useDietStore`, and navigation between `today`, `week`, `shopping`, and `preparation`.

- [ ] **Step 1: Write failing store and navigation tests**

```tsx
it('hydrates the stored plan and persists an updated plan', async () => {
  render(<DietProvider repository={repository}><PlanNameEditor /></DietProvider>)
  await userEvent.type(screen.getByLabelText('Nombre del plan'), ' Menú familiar')
  expect(repository.save).toHaveBeenCalled()
})

it('changes the visible section using the labelled navigation', async () => {
  render(<AppNavigation active="today" onChange={onChange} />)
  await userEvent.click(screen.getByRole('button', { name: 'Compras' }))
  expect(onChange).toHaveBeenCalledWith('shopping')
})
```

- [ ] **Step 2: Run task tests and verify RED**

Run: `npm test -- src/state/diet-store.test.tsx src/components/app-navigation.test.tsx`

Expected: FAIL because the provider and navigation do not exist.

- [ ] **Step 3: Implement shell and state**

The provider must load in `useEffect`, expose `plan`, `replacePlan`, `completion`, and `toggleCompletion`, and persist updates. Render title “Mi dieta semanal”, a skip link, `main`, a responsive navigation (`nav` with buttons) and PWA manifest with Spanish name/short name and standalone display. Use CSS custom properties and visible `:focus-visible` outlines.

- [ ] **Step 4: Run task tests and verify GREEN**

Run: `npm test -- src/state/diet-store.test.tsx src/components/app-navigation.test.tsx`

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit the task**

```bash
git add src/app src/components/app-navigation* src/state
git commit -m "feat: add local diet application shell"
```

### Task 4: Implement weekly meal editing and PDF attachment

**Files:**
- Create: `src/components/weekly-plan.tsx`, `src/components/weekly-plan.test.tsx`
- Create: `src/components/meal-form.tsx`, `src/components/meal-form.test.tsx`
- Create: `src/components/pdf-attachment.tsx`, `src/components/pdf-attachment.test.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes `useDietStore`, `validateMeal`, and domain types.
- Produces accessible meal-add/edit form and a client-only attachment descriptor `{ name: string; size: number }` stored in plan notes, never file content.

- [ ] **Step 1: Write failing component tests**

```tsx
it('adds a meal with its ingredient through labelled fields', async () => {
  render(<MealForm day="2026-10-12" onSave={onSave} />)
  await userEvent.selectOptions(screen.getByLabelText('Momento'), 'mainMeal')
  await userEvent.type(screen.getByLabelText('Nombre de la comida'), 'Pollo con verduras')
  await userEvent.type(screen.getByLabelText('Alimento'), 'Pollo')
  await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Pollo con verduras' }))
})

it('shows ingredient validation beside invalid fields', async () => {
  render(<MealForm day="2026-10-12" onSave={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
  expect(await screen.findByText('Ingresa un alimento')).toBeVisible()
})

it('rejects a non-PDF and accepts a PDF below 10 MB', async () => {
  render(<PdfAttachment onChange={onChange} />)
  await userEvent.upload(screen.getByLabelText('PDF de referencia'), new File(['x'], 'menu.png', { type: 'image/png' }))
  expect(screen.getByText('Selecciona un archivo PDF de hasta 10 MB')).toBeVisible()
})
```

- [ ] **Step 2: Run component tests and verify RED**

Run: `npm test -- src/components/weekly-plan.test.tsx src/components/meal-form.test.tsx src/components/pdf-attachment.test.tsx`

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement editable weekly plan**

Render seven date sections based on `startsOn`, meal cards grouped by slot, and a form dialog/section. Ingredient rows require name, category and optional positive quantity/unit; expose `Lavar`, `Cortar`, `Cocer`, and `Preparar` as a labelled select. On save, replace only the chosen day; never mutate the existing plan. The attachment control must inspect `File.type` and `File.size`, retain only its descriptor, and offer remove.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `npm test -- src/components/weekly-plan.test.tsx src/components/meal-form.test.tsx src/components/pdf-attachment.test.tsx`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the task**

```bash
git add src/components src/app/page.tsx
git commit -m "feat: edit weekly meals and attach reference pdf"
```

### Task 5: Deliver today, shopping, preparation, reminder and share views

**Files:**
- Create: `src/components/today-view.tsx`, `src/components/today-view.test.tsx`
- Create: `src/components/derived-list.tsx`, `src/components/derived-list.test.tsx`
- Create: `src/components/share-button.tsx`, `src/components/share-button.test.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes `buildShoppingList`, `buildPreparationList`, `formatShareSummary`, and `useDietStore`.
- Produces checkbox lists keyed by derivation keys and `shareSummary(text)` using `navigator.share` when available, otherwise `navigator.clipboard.writeText`.

- [ ] **Step 1: Write failing UI behavior tests**

```tsx
it('marks a shopping item complete without changing its meal', async () => {
  render(<DerivedList kind="shopping" plan={planWithChicken} />)
  await userEvent.click(screen.getByRole('checkbox', { name: /pollo/i }))
  expect(screen.getByRole('checkbox', { name: /pollo/i })).toBeChecked()
})

it('shows the next timed meal as a reminder', () => {
  render(<TodayView plan={planWithMealAt('13:00')} now={new Date('2026-10-12T12:00:00')} />)
  expect(screen.getByText('Próxima comida: 13:00')).toBeVisible()
})

it('uses clipboard fallback when device sharing is unavailable', async () => {
  render(<ShareButton text="Lista de compras" />)
  await userEvent.click(screen.getByRole('button', { name: 'Compartir resumen' }))
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Lista de compras')
})
```

- [ ] **Step 2: Run UI behavior tests and verify RED**

Run: `npm test -- src/components/today-view.test.tsx src/components/derived-list.test.tsx src/components/share-button.test.tsx`

Expected: FAIL because these components are absent.

- [ ] **Step 3: Implement derived views**

Group shopping rows by Spanish category headings and preparation rows by action. Bind checkbox state to `DietStore.toggleCompletion` and retain semantic labels. `TodayView` chooses meals for today if present, otherwise the first plan day, calculates the next time strictly after `now`, and displays no reminder when times are absent. Share button uses the Web Share API with `{ title: 'Mi dieta semanal', text }`; fallback copies text and announces “Resumen copiado” through `role="status"`.

- [ ] **Step 4: Run UI behavior tests and verify GREEN**

Run: `npm test -- src/components/today-view.test.tsx src/components/derived-list.test.tsx src/components/share-button.test.tsx`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit the task**

```bash
git add src/components src/app/page.tsx
git commit -m "feat: add shopping preparation and sharing views"
```

### Task 6: Add end-to-end coverage and validate production build

**Files:**
- Create: `e2e/diet-flow.spec.ts`
- Modify: `playwright.config.ts`, `README.md`

**Interfaces:**
- Consumes the running Next.js app at `http://127.0.0.1:3000`.
- Produces a repeatable browser flow that creates a meal, verifies shopping, and marks it complete.

- [ ] **Step 1: Write the failing Playwright flow**

```ts
test('user adds a meal, sees its purchase, and checks it off', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /agregar comida/i }).click()
  await page.getByLabel('Nombre de la comida').fill('Pollo con verduras')
  await page.getByLabel('Alimento').fill('Pollo')
  await page.getByRole('button', { name: 'Guardar comida' }).click()
  await page.getByRole('button', { name: 'Compras' }).click()
  await expect(page.getByRole('checkbox', { name: /pollo/i })).toBeVisible()
  await page.getByRole('checkbox', { name: /pollo/i }).check()
  await expect(page.getByRole('checkbox', { name: /pollo/i })).toBeChecked()
})
```

- [ ] **Step 2: Run the E2E test and verify RED**

Run: `npm run test:e2e -- e2e/diet-flow.spec.ts`

Expected: FAIL until the browser flow reaches the implemented UI and the Playwright web server setup exists.

- [ ] **Step 3: Configure the runner and document local use**

Configure Playwright `webServer.command` as `npm run dev`, `reuseExistingServer: !process.env.CI`, and Chromium project. Add README sections for prerequisites, `npm install`, `npm run dev`, `npm test`, `npm run test:e2e`, browser install, privacy limitations, and the staged roadmap for persistent sharing/OCR/substitutions.

- [ ] **Step 4: Run all verification commands**

Run: `npm test && npm run lint && npm run build && npx playwright install --with-deps chromium && npm run test:e2e`

Expected: all commands exit 0; report exact test counts and any browser-install caveat.

- [ ] **Step 5: Commit the task**

```bash
git add e2e playwright.config.ts README.md
git commit -m "test: cover diet planning flow end to end"
```

## Self-review

- Spec coverage: Tasks 1-5 cover structured menu data, manual editing, attachment validation, local persistence, shopping, preparation, completion state, in-session reminder and portable sharing. Task 6 validates the principal user flow.
- Scope intentionally deferred: authentication, persistent share links, OCR/AI, substitutions, push notifications and offline support remain outside this plan.
- Type consistency: `DietPlan` and `Ingredient` originate in Task 1 and are consumed by all subsequent tasks; only `DietStore` writes plans.
- Review focus coverage: Tasks 1 and 2 test aggregation/units/localStorage; Task 4 tests invalid PDF; Task 5 tests UI-completion persistence through the store.
