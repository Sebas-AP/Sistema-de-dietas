# Re-revisión — Task 1

## Veredicto

**Los tres puntos de esta ronda quedan corregidos según la inspección estática.** No ejecuté pruebas, conforme al alcance solicitado; los resultados citados en `task-1-report.md` (17/17, 83/83, TypeScript y lint) se consideran reportados por su autor, no verificados en esta re-revisión.

## Comprobaciones

- **Rechazo estricto de claves desconocidas — corregido.** `src/domain/import-draft.ts:29-36` rechaza cualquier clave propia enumerable fuera de la lista permitida; `parseImportDraft` aplica `record` al objeto raíz, día, comida e ingrediente (`:68-84`). `src/domain/import-draft.test.ts:66-73` incluye un caso para cada nivel. Alcance: esto comprueba claves JSON ordinarias; claves símbolo/no enumerables no forman parte de una respuesta JSON.
- **Mapeo de días con inicio distinto de lunes — corregido para el inicio mostrado.** `src/domain/import-draft.ts:119-127` obtiene el día de semana real de `current.startsOn` y calcula el desplazamiento circular; el caso de martes verifica que martes sea el primer día y lunes caiga seis días después (`src/domain/import-draft.test.ts:101-112`). La UI usa `startsOn` como inicio del rango semanal, y el selector acepta fechas (`src/components/weekly-plan.tsx:40,90-91`), así que este mapeo preserva el comportamiento visible.
- **Metadatos no verificados de pdfjs — corregido.** `package.json` y `package-lock.json` no contienen `pdfjs-dist`; tampoco muestran cambios en `git status`. La entrada manual citada en la revisión original ya no está presente. El lockfile es versionado (`git ls-files package-lock.json`).

## Ejecución

No se ejecutaron tests, lint, typecheck ni instalación, según la instrucción de esta re-revisión. No se emite veredicto de pipeline.
