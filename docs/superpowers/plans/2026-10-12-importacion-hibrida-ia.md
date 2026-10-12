# Importación híbrida de dietas con IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar un PDF de dieta como borrador revisable usando texto primero y visión solo cuando el resultado no sea confiable.

**Architecture:** El cliente extrae texto localmente con PDF.js y llama una ruta de Next.js; esa ruta usa la clave de NVIDIA en el servidor y valida una respuesta JSON estricta. Solo ante un borrador incompleto el cliente renderiza hasta dos páginas a PNG y pide análisis de visión. El borrador se revisa en la interfaz antes de reemplazar el plan local.

**Tech Stack:** Next.js App Router, TypeScript, `pdfjs-dist`, Vitest, React Testing Library, Playwright, NVIDIA NIM OpenAI-compatible API.

**Spec:** `docs/superpowers/specs/2026-10-12-importacion-hibrida-ia-design.md`

## Global Constraints

- No guardar PDF, imágenes, prompts ni respuestas de IA.
- Pedir consentimiento explícito antes de transmitir texto o imágenes a NVIDIA.
- `NVIDIA_API_KEY` solo se lee con `process.env` en el servidor y nunca se devuelve al cliente.
- Texto primero; visión solo ante JSON inválido, menos de tres días con comida o confianza menor a `0.8`.
- El fallback usa máximo dos páginas PNG renderizadas a 150 DPI.
- La ruta responde `Cache-Control: no-store` y no revela secretos ni respuestas internas.
- La IA genera un borrador; solo “Importar al plan” modifica localStorage.
- Toda la interfaz visible permanece en español (México), sin recomendaciones clínicas.

## Review Focus

- PDF con texto de columnas desordenado debe llegar a revisión o activar visión, nunca importarse silenciosamente.
- Una respuesta de NVIDIA con JSON no válido, campos extraños o cantidades negativas debe rechazarse sin cambiar el plan.
- El navegador no debe realizar ninguna petición antes de aceptar el consentimiento.
- PDF de tres o más páginas solo debe incluir las primeras dos imágenes en fallback.
- Fallos del proveedor, timeout o clave ausente deben mostrar un error seguro y conservar el plan existente.

## File Structure

- `src/domain/import-draft.ts`: contrato de borrador, validación y conversión inmutable a `DietPlan`.
- `src/server/nvidia-diet-client.ts`: cliente HTTP server-only y prompt estructurado.
- `src/app/api/import-diet/route.ts`: validación HTTP, criterio de fallback y mapeo de errores.
- `src/components/pdf-importer.ts`: extracción local de texto/imágenes con PDF.js.
- `src/components/import-diet-dialog.tsx`: consentimiento, progreso, revisión, cancelar e importar.
- `src/components/weekly-plan.tsx`: punto de entrada del diálogo de importación.
- `src/**/**.test.*`, `e2e/import-diet.spec.ts`: cobertura unitaria, de ruta, componente y navegador con NVIDIA simulado.

### Task 1: Contratos de importación y cliente NVIDIA seguro

**Files:**
- Create: `src/domain/import-draft.ts`, `src/domain/import-draft.test.ts`
- Create: `src/server/nvidia-diet-client.ts`, `src/server/nvidia-diet-client.test.ts`
- Modify: `.env.example`, `package.json`

**Interfaces:**
- Produces `ImportDraft`, `parseImportDraft(value: unknown): ImportDraft`, `shouldUseVision(draft): boolean`, and `draftToPlan(draft, current): DietPlan`.
- Produces `analyzeDiet(input: TextImportInput | VisionImportInput): Promise<ImportDraft>`.

- [ ] **Step 1: Write failing draft validation tests**

```ts
it('rejects a response with a negative quantity without mutating the current plan', () => {
  expect(() => parseImportDraft({ confidence: 0.9, days: [{ weekday: 'monday', meals: [{ title: 'Cena', slot: 'dinner', ingredients: [{ name: 'Arroz', quantity: -1, category: 'pantry' }] }] }] })).toThrow('cantidad')
})

it('requests vision for a valid draft below 0.8 confidence', () => {
  expect(shouldUseVision(validDraft({ confidence: 0.79 }))).toBe(true)
})

it('converts a reviewed draft without changing the current plan object', () => {
  const next = draftToPlan(validDraft(), currentPlan)
  expect(next).not.toBe(currentPlan)
  expect(currentPlan.days).toHaveLength(1)
})
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm test -- src/domain/import-draft.test.ts`

Expected: FAIL because import draft functions do not exist.

- [ ] **Step 3: Implement strict import contracts**

Accept only known meal slots, categories, preparation actions, days, finite positive quantities, 0–1 confidence, title/name lengths of 1–160 and at most 30 ingredients per meal. Map weekday order to the Monday-based current `startsOn`; create IDs with `crypto.randomUUID()` and preserve plan metadata but replace `days` only in the returned copy.

- [ ] **Step 4: Write failing NVIDIA request tests**

```ts
it('sends the key only as a server bearer authorization header', async () => {
  await analyzeDiet({ mode: 'text', pages: [{ number: 1, text: 'LUNES: COMIDA pollo' }] })
  expect(fetch).toHaveBeenCalledWith('https://integrate.api.nvidia.com/v1/chat/completions', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }))
})

it('throws a safe configuration error when NVIDIA_API_KEY is absent', async () => {
  await expect(analyzeDiet(textInput)).rejects.toThrow('El servicio de importación no está configurado')
})
```

- [ ] **Step 5: Run NVIDIA tests to verify RED**

Run: `npm test -- src/server/nvidia-diet-client.test.ts`

Expected: FAIL because the server client does not exist.

- [ ] **Step 6: Implement the server-only NVIDIA client and verify GREEN**

Use `fetch` to the NVIDIA chat-completions endpoint with `stream: false`, fixed low temperature, and `response_format`/prompt asking for JSON only. Select `NVIDIA_TEXT_MODEL` for text and `NVIDIA_MODEL` for vision; throw user-safe errors for missing configuration, non-OK status, timeout and malformed provider output. Do not log pages, prompt, headers or key. Add blank model names to `.env.example` and add `pdfjs-dist` to dependencies.

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- src/domain/import-draft.test.ts src/server/nvidia-diet-client.test.ts`

Expected: PASS.

```bash
git add src/domain/import-draft* src/server/nvidia-diet-client* .env.example package.json package-lock.json
git commit -m "feat: add secure hybrid diet import contracts"
```

### Task 2: Server route and local PDF extraction

**Files:**
- Create: `src/app/api/import-diet/route.ts`, `src/app/api/import-diet/route.test.ts`
- Create: `src/components/pdf-importer.ts`, `src/components/pdf-importer.test.ts`

**Interfaces:**
- Consumes `analyzeDiet` and `shouldUseVision` from Task 1.
- Produces `POST(request): Response`, `extractTextPages(file): Promise<TextPage[]>`, and `renderVisionPages(file, maxPages = 2): Promise<VisionPage[]>`.

- [ ] **Step 1: Write failing route tests**

```ts
it('returns a no-store text draft without exposing provider details', async () => {
  const response = await POST(jsonRequest({ mode: 'text', pages: [{ number: 1, text: 'LUNES' }] }))
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(await response.json()).toMatchObject({ needsVision: false })
})

it('returns 413 when vision contains more than two pages', async () => {
  expect((await POST(jsonRequest({ mode: 'vision', pages: [page(), page(), page()] }))).status).toBe(413)
})
```

- [ ] **Step 2: Run route tests to verify RED**

Run: `npm test -- src/app/api/import-diet/route.test.ts`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement route validation and safe errors**

Limit text to 20 pages and 60,000 total characters; limit vision to two `data:image/png;base64,` pages of 5 MB each. Return 400 for invalid request, 413 for limits, 502 for provider failure, and no-store for every result. Return a draft with `needsVision` computed from Task 1; never include source pages.

- [ ] **Step 4: Write failing PDF extractor tests**

```ts
it('reads text page by page before rendering images', async () => {
  await expect(extractTextPages(pdfFixture)).resolves.toEqual([{ number: 1, text: 'LUNES' }])
})

it('renders only the first two pages at 150 DPI for vision fallback', async () => {
  const pages = await renderVisionPages(threePageFixture)
  expect(pages).toHaveLength(2)
  expect(pages[0].dataUrl).toMatch(/^data:image\/png;base64,/)
})
```

- [ ] **Step 5: Run extractor tests to verify RED**

Run: `npm test -- src/components/pdf-importer.test.ts`

Expected: FAIL because the extraction functions do not exist.

- [ ] **Step 6: Implement PDF.js extraction and verify GREEN**

Load PDF.js only in browser code. Extract text in page order, trim whitespace and retain page numbers. Render fallback PNG using a canvas viewport scaled to 150/72; release document/resources in `finally`; never use upload, object URL persistence or localStorage.

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- src/app/api/import-diet/route.test.ts src/components/pdf-importer.test.ts`

Expected: PASS.

```bash
git add src/app/api/import-diet src/components/pdf-importer* package.json package-lock.json
git commit -m "feat: add hybrid import route and local PDF extraction"
```

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
