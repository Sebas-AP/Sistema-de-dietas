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

