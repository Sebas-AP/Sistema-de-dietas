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

