# Re-revisión — fix de Task 3

Alcance: inspección estática de los cuatro hallazgos de `task-3-review.md` y sus correcciones descritas en `task-3-report.md`. No ejecuté pruebas ni otros comandos de pipeline, conforme a la instrucción de esta re-revisión.

## Veredicto

**Los cuatro hallazgos de la revisión anterior están corregidos en el código inspeccionado.** La extracción visual insuficiente no llega a revisión/importación, el diálogo implementa aislamiento de fondo y teclado, la cancelación se pasa a la extracción y render PDF, y el selector E2E es exacto. Esto no es una aprobación del pipeline: las pruebas y E2E no se ejecutaron en esta ronda.

## Comprobaciones

- **Resultado visual insuficiente — corregido.** Tras la respuesta de visión, `src/components/import-diet-dialog.tsx:124-128` vuelve a evaluar `shouldUseVision(result)`. Si persiste la insuficiencia, vuelve a `select`, muestra un error y retorna antes de `setDraft`/`setStage('review')` (`:131-133`); por tanto no aparece el botón de importación para ese resultado. Las regresiones cubren confianza baja y menos de tres días con comidas en `src/components/import-diet-dialog.test.tsx:104-124`. La importación confirmada sigue validando el borrador antes de `replacePlan` (`import-diet-dialog.tsx:151-164`).
- **Foco modal, Escape y fondo inerte — corregido.** El diálogo se crea en un portal directo en `document.body` (`src/components/import-diet-dialog.tsx:48-52,176-179`), establece `inert` en los demás hijos del body y restaura el estado previo al desmontarse (`:50-52,78-83`). Enfoca el título inicialmente y maneja Escape; Tab y Shift+Tab se mantienen en los controles del diálogo (`:53-75`). La prueba correspondiente comprueba foco inicial, ambos extremos de tabulación, Escape e inert (`src/components/import-diet-dialog.test.tsx:126-140`). Semana conserva el retorno del foco al disparador (`src/components/weekly-plan.tsx:49-52,124`).
- **Cancelación cooperativa — corregido.** El diálogo pasa el mismo `AbortSignal` a `extractTextPages` y `renderVisionPages` (`src/components/import-diet-dialog.tsx:110-124`) y comprueba aborto después de cada operación antes de continuar (`:115,118,122,131`). El importador aborta operaciones pendientes, destruye el loading task en `finally` y cancela el render activo del canvas (`src/components/pdf-importer.ts:4-17,20-32,35-40,51-68`). La prueba de componente confirma que cancelar durante extracción aborta la señal y no inicia `fetch` (`src/components/import-diet-dialog.test.tsx:143-155`); las pruebas de operaciones pendientes del importador se reportan en `task-3-report.md`.
- **Selector E2E — corregido.** La comprobación del nombre en `e2e/import-diet.spec.ts:53,56` especifica `{ exact: true }`, así que no coincide parcialmente con “Nombre del plan importado”. Los controles propios del modal están acotados al locator `dialog`.

## Ejecución

No ejecuté tests, lint, typecheck, build ni E2E. Las cifras/resultados consignados por el implementador en `task-3-report.md` no se consideran verificados por esta re-revisión.

No encontré regresiones en los cuatro fixes revisados. No afirmo que las pruebas pasen: no se ejecutaron en esta re-revisión.
