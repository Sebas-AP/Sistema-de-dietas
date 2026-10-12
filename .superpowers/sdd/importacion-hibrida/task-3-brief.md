### Task 3: Consent, review, import UI, and end-to-end coverage

**Files:**
- Create: `src/components/import-diet-dialog.tsx`, `src/components/import-diet-dialog.test.tsx`
- Modify: `src/components/weekly-plan.tsx`, `src/components/weekly-plan.test.tsx`, `src/app/globals.css`, `README.md`
- Create: `e2e/import-diet.spec.ts`

**Interfaces:**
- Consumes `extractTextPages`, `renderVisionPages`, API response `ImportDraft`, and `useDietStore().replacePlan`.
- Produces an import dialog requiring `acceptedPrivacy: true` before calls and applying `draftToPlan` only after confirmation.

- [ ] **Step 1: Write failing consent/review tests**

```tsx
it('does not call the importer until the user accepts sending data to NVIDIA', async () => {
  render(<ImportDietDialog file={pdfFile} onClose={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
  expect(importer).not.toHaveBeenCalled()
  await userEvent.click(screen.getByLabelText(/Acepto enviar/i))
  await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
  expect(importer).toHaveBeenCalled()
})

it('replaces the plan only after reviewing and confirming import', async () => {
  render(<ImportDietDialog file={pdfFile} onClose={vi.fn()} />)
  await completeConsentAndAnalysis()
  expect(replacePlan).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Importar al plan' }))
  expect(replacePlan).toHaveBeenCalled()
})
```

- [ ] **Step 2: Run UI tests to verify RED**

Run: `npm test -- src/components/import-diet-dialog.test.tsx`

Expected: FAIL because the dialog does not exist.

- [ ] **Step 3: Implement consent and review workflow**

Add an “Importar desde PDF” button beside the existing reference attachment. Modal copy names NVIDIA, states that text and possibly page images are transmitted, and makes the checkbox mandatory. Show stages “Leyendo texto”, “Analizando menú” and “Revisar borrador”. Provide editable title, meals and ingredients; errors preserve the current plan. Cancel discards the in-memory file/draft. Confirm applies `draftToPlan` through the store.

- [ ] **Step 4: Write the failing E2E flow**

```ts
test('imports a reviewed text draft only after consent', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Importar desde PDF' }).click()
  await page.getByLabel(/Acepto enviar/i).check()
  await page.getByRole('button', { name: 'Analizar PDF' }).click()
  await expect(page.getByText('Revisar borrador')).toBeVisible()
  await page.getByRole('button', { name: 'Importar al plan' }).click()
  await expect(page.getByText('Pollo con verduras')).toBeVisible()
})
```

- [ ] **Step 5: Implement Playwright route mocking and verify GREEN**

Mock `POST /api/import-diet` with a valid text draft; do not call NVIDIA in E2E. Add README setup for Vercel environment variables, consent/privacy statement, model variable descriptions and local verification commands.

- [ ] **Step 6: Run full verification and commit**

Run: `npm test && npm run lint && npm run build && npm run test:e2e`

Expected: PASS; if the sandbox cannot bind a port, report that E2E runner limitation separately while preserving unit/build evidence.

```bash
git add src/components/import-diet-dialog* src/components/weekly-plan* src/app/globals.css README.md e2e/import-diet.spec.ts
git commit -m "feat: import reviewed diet drafts from PDF"
```

## Self-review

- Spec coverage: Task 1 provides strict schema, draft conversion and server-only NVIDIA calls; Task 2 provides hybrid transport, limits and PDF extraction; Task 3 implements consent, review, import and browser coverage.
- Review focus: invalid/model responses and threshold behavior are in Task 1; request/payload limits are in Task 2; no-call-before-consent and confirmation-only persistence are in Task 3.
- Type consistency: `ImportDraft`, `TextPage`, `VisionPage`, `analyzeDiet`, `extractTextPages` and `renderVisionPages` are produced before consumption and have identical names/signatures across tasks.
- Scope preserved: no PDF persistence, external storage, clinical advice or automatic substitution logic.
