# Revisión independiente — Task 2

Alcance: lectura de brief, diseño, reporte, ruta, importador PDF, pruebas y dependencias. No ejecuté pruebas ni llamé a NVIDIA. El reporte de Task 2 declara `npm test` (101 pruebas), lint, `tsc` y build correctos; esos resultados son evidencia reportada por el implementador, no verificación independiente de esta revisión.

## Veredicto de especificación

**Cumple los requisitos funcionales de Task 2, con una reserva de validación de entrada.** La ruta limita texto a 20 páginas y 60 000 unidades de longitud de JavaScript (`route.ts:5-6,34-39`), visión a dos páginas y 5 × 1024 × 1024 bytes decodificados por página (`route.ts:7-8,41-52`), y distingue 400/413/502. Todas las respuestas que produce `POST` pasan por `jsonResponse`, que fija `Cache-Control: no-store` (`route.ts:57-74`). La respuesta exitosa proviene del borrador validado por `parseImportDraft`, cuyo esquema rechaza campos desconocidos; la ruta recalcula `needsVision` y no agrega las páginas originales (`route.ts:70-71`, `nvidia-diet-client.ts:75`, `import-draft.ts:68-112`). Los errores no exponen excepciones del proveedor (`route.ts:65-66,72-73`).

PDF.js se importa dinámicamente después de comprobar `window`; el import estático restante es solo de tipos (`pdf-importer.ts:1-9`). La extracción recorre páginas en orden, conserva números y recorta texto (`pdf-importer.ts:18-31`). El render limita a las primeras dos páginas, usa escala 150/72 y produce URL PNG (`pdf-importer.ts:34-53`). La tarea de carga se destruye en `finally` y cada canvas se libera (`pdf-importer.ts:10-15,44-50`). No hay subida directa, object URL persistente ni almacenamiento local en este módulo. La ruta de Next.js usa `POST(Request): Promise<Response>` y APIs estándar compatibles con App Router; el cliente NVIDIA permanece en el grafo del servidor de la ruta. Las pruebas de Task 2 simulan `analyzeDiet` y `pdfjs-dist`; las del cliente NVIDIA reemplazan `fetch` y usan `test-key`. No encontré llamadas reales al proveedor ni uso de secretos reales en las pruebas leídas.

Reserva: el prefijo y la sintaxis Base64 se validan, pero el contenido decodificado no se verifica como PNG (`route.ts:44-49`). La prueba usa `cG5n`, que representa la cadena `png`, no una imagen PNG (`route.test.ts:28`). Una solicitud etiquetada como PNG con otros bytes pasa la validación y llega al proveedor. Si “páginas PNG” exige el formato real, este requisito queda incompleto.

## Veredicto de calidad

**Requiere atender dos hallazgos antes de considerar la entrada robusta; la integración real de PDF.js sigue sin comprobarse.**

| Severidad | Ubicación | Hallazgo, impacto y corrección sugerida | Responsable |
| --- | --- | --- | --- |
| Media | `src/app/api/import-diet/route.ts:64` | `request.json()` materializa el cuerpo completo antes de aplicar los límites. Un cuerpo arbitrariamente grande puede consumir memoria y tiempo aunque acabe en 413. Limitar bytes durante la lectura del request, además de los límites semánticos por página. | `security-auditor` |
| Media | `src/app/api/import-diet/route.ts:44-49`; `src/app/api/import-diet/route.test.ts:28` | La validación acepta bytes no PNG bajo un data URL PNG; el fixture actual consolida ese falso positivo. Comprobar al menos la firma PNG decodificada y añadir casos positivos y negativos con datos reales. | `backend-developer` |
| Verificación pendiente | `src/components/pdf-importer.test.ts:5-25`; `src/components/pdf-importer.ts:6-7,45` | El mock sustituye PDF.js y no prueba que Next publique la URL del worker ni que un PDF real se abra y renderice en el navegador. El build reportado solo demuestra compilación de la ruta actualmente usada; el importador todavía no está conectado a la UI. Hacer una comprobación de navegador con PDF real y, si falla, ajustar carga del worker/render. | `integration-tester` / `frontend-developer` |

Nota de precisión: “5 MB” del brief está implementado como **5 MiB** (`5 * 1024 * 1024`). Si el producto requiere 5 000 000 bytes exactos, hay que aclarar y ajustar ese umbral; no lo clasifico como fallo concluyente porque el brief no define la unidad binaria o decimal.
