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

