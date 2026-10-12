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
