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

