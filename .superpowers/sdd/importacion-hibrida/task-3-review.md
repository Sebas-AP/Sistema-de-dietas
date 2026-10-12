# Revisión independiente — Task 3

## Veredicto

**No listo para merge.** El flujo principal de consentimiento, revisión y confirmación está correctamente conectado, pero queda un borrador visual insuficiente que puede importarse, la prueba E2E de texto tiene un selector ambiguo y el modal no contiene el foco de teclado. El impedimento de puerto del sandbox deja la ejecución de navegador pendiente; no se interpreta como defecto del código.

## Evidencia de ejecución

| Etapa | Estado | Evidencia |
| --- | --- | --- |
| Pruebas de componentes | PASS | `npm test -- src/components/import-diet-dialog.test.tsx src/components/weekly-plan.test.tsx`: 2 archivos, 14 pruebas aprobadas. |
| Lint | PASS | `npm run lint`: salida de `eslint src`, código 0. |
| Tipos | PASS | `npx tsc --noEmit`: sin diagnósticos, código 0. |
| E2E | NO EJECUTADO EN ESTA REVISIÓN | El reporte de Task 3 registra `listen EPERM` al intentar enlazar `0.0.0.0:3000`; se revisó estáticamente la prueba simulada. No hay resultado PASS de navegador. |
| Build | NO EJECUTADO EN ESTA REVISIÓN | El reporte de Task 3 indica que pasó; esta revisión no repitió la compilación. |

## Comprobaciones satisfechas

- `src/components/import-diet-dialog.tsx:68-85` verifica archivo y `acceptedPrivacy` antes de `extractTextPages` y del primer `fetch`; la prueba de componente en `:55-66` confirma que ambas funciones permanecen sin llamadas antes de consentir. El aviso de `:192` identifica NVIDIA, texto y posibles imágenes de dos páginas en español.
- `src/components/import-diet-dialog.tsx:85-93` solicita texto primero y llama a `renderVisionPages` y al modo `vision` únicamente si la respuesta validada marca `needsVision`; `src/app/api/import-diet/route.ts:107-109` calcula esa bandera con `shouldUseVision`. La prueba de componente `:93-102` y los dos escenarios E2E simulados en `e2e/import-diet.spec.ts:35-75` siguen ese orden. Esas pruebas no hacen llamadas reales a NVIDIA.
- La revisión permite editar nombre, título de comidas e ingredientes (`src/components/import-diet-dialog.tsx:153-172`). El único `replacePlan` de este componente está en `importPlan`, tras validar el borrador y pulsar **Importar al plan** (`:124-133`). La prueba `:68-83` confirma que el plan guardado permanece intacto hasta ese clic y que las ediciones se aplican.
- Cancelar aborta el `fetch` vigente, borra las referencias de estado al archivo y borrador y desmonta el diálogo (`src/components/import-diet-dialog.tsx:46-51,112-117`); la prueba `:85-91` comprueba plan sin cambios. La integración en Semana abre el diálogo cerca del PDF de referencia y devuelve foco al disparador (`src/components/weekly-plan.tsx:111-116`; prueba `:86-95`). `draftToPlan` conserva metadatos actuales y remapea los días a la semana vigente (`src/domain/import-draft.ts:119-140`).
- `README.md:18-31,46-50` explica privacidad, límites, NVIDIA y configuración local/Vercel de las tres variables. El PDF de referencia se distingue de la importación.

## Hallazgos

1. **Alta — se puede confirmar una extracción visual todavía insuficiente.** Tras la segunda llamada, `src/components/import-diet-dialog.tsx:92-96` entra en revisión sin evaluar `result.needsVision`. El servidor vuelve a calcular esa bandera también para `mode: 'vision'` (`src/app/api/import-diet/route.ts:107-109`). Si visión devuelve una confianza menor a 0.8 o menos de tres días con comida, `:124-133` solo exige una comida para reemplazar el plan. El diseño permite mostrar un borrador como listo para revisión cuando cumple tres días y confianza >= 0.8 (`docs/superpowers/specs/2026-10-12-importacion-hibrida-ia-design.md`, sección Alcance). Añadir una prueba con respuesta visual `needsVision: true` y un estado de resultado insuficiente que impida confirmar o requiera una decisión explícita conforme al producto. **Responsable: `react-component-architect`**, con prueba de `react-test-writer`.
2. **Media — el E2E de texto usa un selector que coincide con dos campos.** `e2e/import-diet.spec.ts:52` llama `page.getByLabel('Nombre del plan')` mientras el modal permanece abierto. En el DOM existen tanto el campo de Semana con etiqueta exacta `Nombre del plan` (`src/components/weekly-plan.tsx:88-89`) como el del diálogo `Nombre del plan importado` (`src/components/import-diet-dialog.tsx:154-155`). Playwright usa coincidencia parcial por defecto, así que la aserción de `:52` será estrictamente ambigua si el navegador llega a ejecutarla. Limitar al campo exacto o al área de Semana y ejecutar el escenario en un entorno con puerto disponible. **Responsable: `react-test-writer`**.
3. **Media — el modal no contiene el foco de teclado.** `src/components/import-diet-dialog.tsx:46-52,141-146` enfoca el título y declara `aria-modal`, pero no inmoviliza el fondo, no contiene el tabulado ni maneja Escape. `src/components/weekly-plan.tsx:116-117` mantiene el resto de controles de Semana operables tras el diálogo. Un usuario de teclado puede tabular hacia el plan subyacente durante el consentimiento o la revisión, contra la semántica anunciada por `aria-modal`. Integrar manejo de foco modal y cubrir tabulación/cierre por teclado. **Responsable: `react-accessibility-auditor`**.
4. **Baja — cancelar una lectura local deja el trabajo PDF activo hasta que termine.** `src/components/import-diet-dialog.tsx:112-117` aborta `AbortController`, pero `extractTextPages(file)` y `renderVisionPages(file)` no aceptan señal (`:82,89`; `src/components/pdf-importer.ts:18-53`). Las verificaciones posteriores evitan solicitudes nuevas y el extractor destruye su documento en `finally`, pero cancelar durante un PDF lento no detiene el parseo/renderizado ni libera inmediatamente las referencias capturadas. Proveer cancelación cooperativa del trabajo PDF y una prueba con promesa pendiente. **Responsable: `react-component-architect`** y, para el extractor, `frontend-developer`.

No se modificó código de aplicación. Esta revisión solo agregó este informe.
