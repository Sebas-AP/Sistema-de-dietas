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

