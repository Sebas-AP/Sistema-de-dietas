# Task 4 — revisión independiente

## Alcance y evidencia

Revisé el brief y reporte de Task 4, las interfaces de Tasks 1–3, y los componentes, página, CSS, tipos, repositorio y pruebas afectados. El directorio no es un repositorio Git utilizable (`git status` devuelve `fatal: not a git repository`), por lo que no hay diff verificable ni atribución de líneas por commit. Esta revisión compara los archivos entregados con el brief. No ejecuté pruebas, por instrucción; los resultados de verificación citados abajo proceden del reporte de Task 4 y no son una comprobación independiente.

Ruling registrado: `DietPlan.attachment` es un único descriptor local `{ name: string; size: number }`. Los bytes del archivo nunca se almacenan. El campo opcional del plan sustituye la frase incompatible del brief sobre guardarlo en “plan notes”.

## Requisitos

| Criterio | Resultado por inspección | Evidencia |
| --- | --- | --- |
| Siete secciones de fecha desde `startsOn` | Cumple para una fecha válida; hay un caso de fecha inválida que puede romper el render | `weekly-plan.tsx:49–50, 94–101`; hallazgo 2 |
| Tarjetas agrupadas por momento | Cumple | `weekly-plan.tsx:99, 107–125`; orden y etiquetas en `meal-form.tsx:8–15` |
| Formulario etiquetado y validado | Cumple en el flujo normal: título, alimento, categoría y cantidad positiva opcional; errores junto a campos | `meal-form.tsx:78–103, 105–175`; `validateMeal` en `meal-validation.ts:3–13` |
| Acciones Lavar, Cortar, Cocer, Preparar como selector | Cumple | `meal-form.tsx:25–30, 149–153` |
| Cambiar solamente el día elegido sin mutar el plan anterior | Cumple por construcción para alta, edición y borrado | `weekly-plan.tsx:27–41, 52–59, 129`; el test comprueba que otra fecha conserva su comida, pero no la identidad de objetos (`weekly-plan.test.tsx:24–35`) |
| Rechazar no PDF o más de 10 MiB y permitir quitar | Cumple por inspección; `File.type` y `File.size` se comprueban antes de emitir el descriptor | `pdf-attachment.tsx:17–26, 41–45`; pruebas declaradas en `pdf-attachment.test.tsx:7–29` |
| Persistencia de comidas y descriptor | Ruta implementada: `replacePlan` guarda con `LocalPlanRepository`; el repositorio acepta planes previos sin adjunto y valida descriptor | `diet-store.tsx:63–74`, `local-plan-repository.ts:45–62, 76–95`, `weekly-plan.test.tsx:34–47` |
| Español y accesibilidad | Etiquetas visibles, secciones con nombre, errores relacionados por `aria-describedby`; queda un problema de foco al cerrar el editor | `weekly-plan.tsx:61–130`, `meal-form.tsx:105–175`, `pdf-attachment.tsx:29–47`; hallazgo 3 |
| Sin subida externa ni almacenamiento de bytes | Cumple por inspección de la ruta: el archivo se reduce a nombre y tamaño; no hay lectura de bytes, objeto URL, `fetch` ni `FormData` en estos componentes | `pdf-attachment.tsx:17–26`, `weekly-plan.tsx:93`, `local-plan-repository.ts:51–57, 89–95` |

## Hallazgos de calidad

1. **Importante — comidas invisibles siguen afectando compras y preparación al cambiar de semana.** `weekly-plan.tsx:78–80` cambia `startsOn` sin actualizar `days`; `weekly-plan.tsx:94–98` muestra solamente las nuevas siete fechas, pero `plan-derivations.ts:6–8, 39–41` recorre todos los días guardados. Ejemplo: tras crear comidas en la semana A y elegir la semana B, la vista Semana aparece vacía mientras las futuras listas contienen ingredientes de A. Conviene definir explícitamente si cambiar la fecha navega entre semanas o reprograma el plan y mantener las derivaciones alineadas con esa decisión. Responsable: `react-state-data-architect` (semántica del estado) y desarrollo general para el cambio de UI/dominio.

2. **Moderado — una fecha persistida que pasa la expresión regular puede lanzar al renderizar.** `weekly-plan.tsx:49` comprueba solo la forma `YYYY-MM-DD`; `weekly-plan.tsx:15–18` llama a `toISOString()` sobre el resultado. `local-plan-repository.ts:49` acepta cualquier cadena como `startsOn`, por ejemplo `2026-99-99`; esta pasa la expresión regular, crea una fecha inválida y `toISOString()` lanza `RangeError`. Validar que sea una fecha de calendario real antes de usarla, o usar el lunes local de reserva para datos inválidos. Responsable: desarrollo general (validación de entrada); `react-test-writer` para regresión de UI.

3. **Moderado — el foco se pierde al cerrar o guardar el editor.** El campo de título recibe `autoFocus` (`meal-form.tsx:122`), pero guardar o cancelar desmonta el formulario con `setEditor(null)` (`weekly-plan.tsx:129`) sin devolver foco al botón que lo abrió. La eliminación de una tarjeta hace desaparecer también el botón activo (`weekly-plan.tsx:119–120, 52–59`). Para teclado y lector de pantalla, devolver el foco al control de origen o al encabezado del día tras esas acciones. Responsable: `react-accessibility-auditor`.

4. **Menor — errores de ingrediente pueden señalar otra fila tras quitar una anterior.** Los mensajes se guardan con índice en `errors` (`meal-form.tsx:93–100`) y la eliminación cambia los índices sin recalcular/limpiar errores (`meal-form.tsx:131–146`). Tras un intento inválido, quitar la primera fila puede mostrar su error junto a la siguiente hasta volver a enviar. Limpiar o recalcular esos errores al modificar filas. Responsable: `react-component-architect`; `react-test-writer` para cubrir el caso.

## Verificación y veredictos

El reporte de Task 4 registra `npm test` y `npm run lint` con salida 127 por binarios ausentes. Registra además 19 pruebas de lógica aprobadas con un runner externo, pero las cinco suites de UI no se colectaron porque falta `@testing-library/react`; el chequeo TypeScript externo y el bundle esbuild salieron con código 0. No hubo build Next ni flujo de navegador verificado. No reinterpreté esas ejecuciones como un pipeline verde.

**Veredicto de especificación:** implementación sustancialmente alineada con los requisitos explícitos y con el ruling del descriptor, con reserva por las fechas inválidas y la coherencia al cambiar semana. La validación funcional de UI sigue pendiente por dependencias ausentes.

**Veredicto de calidad:** requiere correcciones de los hallazgos 1–3 antes de dar Task 4 por cerrada; el hallazgo 4 puede atenderse en la misma ronda. **Merge/deploy: no**, porque la semana puede presentar datos ocultos en listas, una fecha guardada puede romper la vista y el pipeline configurado no se ha podido ejecutar completo.
