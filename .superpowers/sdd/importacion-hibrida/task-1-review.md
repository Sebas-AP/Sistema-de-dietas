# Revisión independiente — Task 1

## Veredicto

**Requiere cambios antes de integrar Task 1.** El cliente mantiene la clave en código de servidor, usa `fetch` con `no-store` y timeout, y devuelve errores genéricos ante fallas del proveedor. La validación cubre enumeraciones, cantidades, confianza y duplicados; `shouldUseVision` aplica el umbral de 0.8 y tres días con comidas. `draftToPlan` crea un objeto y días nuevos, sin mutar el plan actual. Hay tres defectos funcionales/de entrega abajo.

Esta revisión fue estática: **no ejecuté pruebas ni llamadas a NVIDIA**. Las cifras de 78 pruebas, lint y TypeScript proceden de `task-1-report.md`, no son resultados verificados por esta revisión. Las pruebas de `nvidia-diet-client.test.ts` usan `fetch` simulado.

## Hallazgos

1. **Alta — Se aceptan campos extraños en la respuesta de IA.** `src/domain/import-draft.ts:64-108` reconstruye solo las propiedades conocidas, pero no rechaza propiedades adicionales en el objeto raíz, día, comida o ingrediente. El plan exige rechazar respuestas con “campos extraños” y la especificación exige validación estricta. Una respuesta con datos inesperados puede pasar como válida y llegar a revisión sin indicar que el contrato cambió. Añadir comprobación de claves permitidas por nivel y pruebas para cada nivel. **Responsable: desarrollo general.**

2. **Alta — La fecha calculada supone que `current.startsOn` es lunes sin comprobarlo.** `src/domain/import-draft.ts:115-122` suma el índice lunes→domingo a cualquier fecha válida. La interfaz existente permite seleccionar cualquier fecha (`src/components/weekly-plan.tsx:105-109`), por lo que si el inicio es martes, la comida marcada como lunes se importa en martes. Validar/alinear el inicio semanal según la semántica de la UI y probar una fecha que no sea lunes. **Responsable: desarrollo general.**

3. **Alta — Lockfile incompleto y dependencia no instalada.** `package-lock.json:3856-3859` añade manualmente `pdfjs-dist@6.4.299` sin `integrity` ni metadatos de dependencias verificados; `node_modules/pdfjs-dist` está ausente. El informe reconoce que `npm install` falló por DNS. La instalación reproducible y la compilación de la siguiente tarea no están demostradas. Regenerar `package-lock.json` mediante npm cuando el registro esté accesible y comprobar `npm ci`. **Responsable: desarrollo general/CI.**

4. **Media — El cliente no impone límites a sus entradas.** `src/server/nvidia-diet-client.ts:20-29,33-44` envía todas las páginas y cadenas recibidas. La validación de 20 páginas/60 000 caracteres para texto y dos PNG de hasta 5 MB queda explícitamente asignada a la ruta de Task 2; esa ruta debe validar antes de llamar a `analyzeDiet`. Conviene un test de integración que demuestre que ninguna entrada fuera de límite llega al proveedor. **Responsable: integration-tester / desarrollo general en Task 2.**

5. **Media — JSON inválido no activa visión desde el cliente actual.** `src/server/nvidia-diet-client.ts:70-77` produce un error seguro ante una respuesta malformada, conforme al brief de Task 1. El plan global exige fallback visual también en ese caso. La ruta/interfaz de Task 2/3 deberán distinguir ese error controlado y solicitar visión; si lo tratan como 502 definitivo, se incumplirá el flujo. **Responsable: desarrollo general en Tasks 2/3; integration-tester para cobertura.**

## Comprobaciones positivas y alcance

- `src/server/nvidia-diet-client.ts:34-38,52-68`: la clave procede de `process.env.NVIDIA_API_KEY`, se usa solo en `Authorization`, no hay logging ni devolución del cuerpo de error; los errores de configuración, proveedor y timeout son genéricos. No aparece una llamada HTTP real en las pruebas inspeccionadas.
- `src/domain/import-draft.ts:66-108`: valida el máximo de siete días, días únicos, enumeraciones, hasta 30 ingredientes por comida, cadenas no vacías de longitud limitada, cantidad positiva finita, fecha y confianza de 0 a 1. El máximo de comidas y advertencias no está definido en el contrato de Task 1.
- `src/domain/import-draft.ts:111-112`: pide visión por `needsVision`, confianza inferior a 0.8 o menos de tres días con comidas. `src/domain/import-draft.ts:118-134` no modifica directamente `current`.
- `.env.example` contiene únicamente nombres de variables vacías; `.gitignore` excluye `.env.*` salvo ese ejemplo.
- `git diff --check -- .env.example package.json package-lock.json` no produjo errores. No sustituye una instalación ni las pruebas.
