# Task 3 — UI de importación, consentimiento y revisión

## Resultado

Se agregó **Importar desde PDF** en Semana, junto al área del PDF de referencia. El diálogo selecciona un PDF de hasta 10 MB, exige consentimiento explícito para enviar texto y, si se necesita, imágenes de hasta dos páginas a NVIDIA, muestra progreso y errores controlados, y permite revisar el nombre del plan, las comidas y los ingredientes. El plan guardado no cambia hasta pulsar **Importar al plan**. Cancelar aborta una solicitud en curso y descarta el archivo y el borrador de la memoria del componente.

La respuesta de `/api/import-diet` se valida con `parseImportDraft`; `needsVision` activa el renderizado visual solo después de la fase textual. La confirmación aplica `draftToPlan` y el nombre revisado con una única llamada a `replacePlan`. No se agregó persistencia del archivo, de imágenes ni del borrador.

## Archivos de Task 3

- `src/components/import-diet-dialog.tsx`: consentimiento, lectura/análisis, fallback, revisión y confirmación.
- `src/components/import-diet-dialog.test.tsx`: 8 pruebas de límites de consentimiento, edición, confirmación, cancelación, fallback y errores.
- `src/components/weekly-plan.tsx`, `src/components/weekly-plan.test.tsx`: acceso al diálogo y restauración del foco al cerrar.
- `src/app/globals.css`: estilos del diálogo y el acceso desde Semana.
- `e2e/import-diet.spec.ts`: dos flujos de navegador con PDF sintético y `POST /api/import-diet` simulado; cubren texto y fallback visual sin llamadas reales a NVIDIA.
- `README.md`: uso, privacidad, variables de entorno para Vercel y comandos de verificación.

## TDD y verificación

- RED: `npm test -- src/components/import-diet-dialog.test.tsx` falló por componente inexistente.
- GREEN: las seis pruebas iniciales pasaron tras implementar el diálogo; se corrigió un selector ambiguo quitando el botón de cancelación duplicado.
- RED/GREEN: `weekly-plan.test.tsx` primero falló por ausencia del botón y luego pasó con la integración.
- RED/GREEN: dos pruebas nuevas detectaron que los errores 413 y respuestas estructuradas inválidas se mostraban con un mensaje genérico; después pasaron con mensajes seguros y específicos.
- `npm test`: **21 archivos, 113 pruebas aprobadas**.
- `npm run lint`: **aprobado**.
- `npx tsc --noEmit`: **aprobado**.
- `npm run build`: **aprobado**; la ruta `/api/import-diet` aparece en el resultado de Next.js.
- `npm run test:e2e -- e2e/import-diet.spec.ts`: **no pudo iniciar**. Playwright informó `Process from config.webServer exited early`. La ejecución directa de `npm run dev` confirmó `listen EPERM: operation not permitted 0.0.0.0:3000`, una restricción de enlace de puertos del sandbox. No se ejecutaron pruebas de navegador, por lo que sus resultados quedan pendientes de un entorno con puerto disponible.

## Notas

- Los tests de componente simulan extracción y `fetch`; los E2E interceptan la ruta de importación. Ninguno usa datos reales de NVIDIA o un PDF personal.
- No se creó commit, de acuerdo con la instrucción recibida. Se preservaron los artefactos `.next` y los cambios de otras tareas presentes en el árbol de trabajo.

## Correcciones tras revisión (ronda 1)

- La respuesta visual se evalúa de nuevo con `shouldUseVision`. Si mantiene `needsVision`, confianza menor a 0.8 o menos de tres días con comidas, se muestra un error y no se ofrece **Importar al plan**. Dos pruebas nuevas reprodujeron primero el defecto y luego confirmaron el bloqueo.
- Los campos y acciones E2E se buscan dentro del diálogo. El campo de Semana se selecciona con coincidencia exacta para evitar la ambigüedad con **Nombre del plan importado**.
- El diálogo se monta como portal; los demás hijos del documento reciben `inert` mientras está abierto y recuperan su estado original al desmontarse. El foco inicial está en el título, Tab/Shift+Tab permanece dentro del diálogo, Escape cancela, y la vista Semana devuelve el foco al disparador después del cierre. Una prueba de teclado y restauración de `inert` pasó de rojo a verde.
- `extractTextPages` y `renderVisionPages` aceptan `AbortSignal`. La lectura local deja de avanzar al abortar; el render activo recibe `cancel()` y la tarea PDF se destruye. Dos pruebas con operaciones pendientes confirmaron rechazo `AbortError`, cancelación y liberación; otra prueba comprueba que cerrar el diálogo transmite la señal abortada al extractor.

Verificación posterior: `npm test` **119/119**, `npm run lint` **PASS**, `npx tsc --noEmit` **PASS**, `npm run build` **PASS**, `npx playwright test --list` enumera **3 pruebas**. `npm run test:e2e` aún no pudo iniciar el servidor por la restricción de puertos documentada arriba (`Process from config.webServer exited early`, previamente diagnosticado como `listen EPERM 0.0.0.0:3000`). No hubo llamadas reales a NVIDIA ni commit.
