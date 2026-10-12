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

