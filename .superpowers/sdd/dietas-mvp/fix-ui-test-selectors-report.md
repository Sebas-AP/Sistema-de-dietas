# UI test selector repair

## Changes

- Scoped PDF upload queries to the `input[type="file"]` associated with the `PDF de referencia` label. This avoids matching the section whose accessible name comes from the same heading.
- Read the split reminder text from its accessible `status` region and assert its combined text content.
- Scoped the `Avena` title assertion to Monday and selected the meal title element, so it does not collide with the ingredient of the same name.
- No application code changed.

## Verification

- Focused affected files: 3 test files passed, 13 tests passed.
- `npm test`: passed, 16 test files and 60 tests.
- `npm run lint`: passed (`eslint src`).
- `npm run build`: passed; Next.js compiled, checked types, generated all 5 static pages, and finalized build traces.
