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

