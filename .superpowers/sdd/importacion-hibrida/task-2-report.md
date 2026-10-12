# Task 2 report — hybrid PDF import

## Delivered

- `src/app/api/import-diet/route.ts`: accepts text or vision JSON, validates page numbers and payload shape, enforces 20 text pages / 60,000 characters and two PNG pages / 5 MiB decoded per page, and returns 400, 413, or 502 as appropriate. Every response has `Cache-Control: no-store`. The success body is the `ImportDraft` itself with `needsVision` recalculated by `shouldUseVision`; source pages and provider errors are never echoed.
- `src/components/pdf-importer.ts`: dynamically loads PDF.js only when a browser function runs, extracts ordered, trimmed page text (preserving explicit PDF text line endings), and renders at most two pages to PNG at 150/72 viewport scale. It destroys the PDF loading task in `finally` and resets temporary canvases after rendering. It does not upload or persist the PDF.
- `route.test.ts` and `pdf-importer.test.ts`: cover success, fallback, malformed JSON and payloads, boundaries, provider failure, text order, PDF task cleanup, rendering scale, and page limits. The provider and PDF document boundary are mocked; no external request is made.

## Red/green evidence

- Route tests initially failed because `route.ts` was absent, then all 14 failed against a 501 stub. After implementation, 14/14 passed.
- PDF tests initially failed because `pdf-importer.ts` was absent, then all four failed against empty stubs. After implementation, 4/4 passed.
- A type check caught the PDF.js 6 lifecycle distinction: `destroy()` belongs to `PDFDocumentLoadingTask`. This was corrected and verified.

## Final verification

- `npm test`: 20 test files, 101 tests passed.
- `npm run lint`: passed.
- `npx tsc --noEmit --incremental false`: passed.
- `npm run build`: passed; Next.js lists `/api/import-diet` as a dynamic route.

## Scope and notes

- No live NVIDIA call was made. Tests mock `analyzeDiet`, and the existing provider tests mock `fetch`.
- No Git commit was made because `.git` metadata is read-only. Build and verification changed generated `.next` and TypeScript cache artifacts; they were left untouched as instructed.
- Browser PDF behavior is exercised with a PDF.js document double, so an end-to-end real-PDF browser check remains for the UI integration task.

## Review fix round 1

- The request body is now capped at 15 MiB before JSON parsing. An excessive `Content-Length` receives 413 before body reading; requests without a trustworthy length are read as a stream and stopped as soon as the byte cap is exceeded. This bound accommodates two 5 MiB PNG images after Base64 expansion and JSON framing. Malformed JSON and body-read errors still receive safe 400 responses.
- Vision data URLs must now contain the PNG eight-byte signature after Base64 decoding. The positive test uses the repository's actual `public/icons/app-icon-192.png`; a syntactically valid Base64 string containing only `png` is rejected with 400.
- RED: three new route cases failed against the previous implementation (fake PNG reached the mocked provider and returned 502; excessive `Content-Length` returned 502; an overlong stream returned 400). GREEN: focused route suite passed 17/17.
- Final checks after this fix: `npm test` passed 104/104 across 20 files; `npm run lint` passed; `npx tsc --noEmit --incremental false` passed. Build was not rerun because this round instructed us not to touch generated `.next` artifacts. No live provider call or commit was made.
