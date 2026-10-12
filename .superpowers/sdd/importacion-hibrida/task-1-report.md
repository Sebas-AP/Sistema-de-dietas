# Task 1 — Contratos de importación y cliente NVIDIA

## Estado

Implementados los contratos de `ImportDraft`, la validación, el criterio de fallback visual, la conversión inmutable a `DietPlan` y el cliente HTTP de NVIDIA. Todas las pruebas disponibles, TypeScript y lint pasan. La descarga de `pdfjs-dist` quedó pendiente por una falla DNS del registro de npm; Task 1 no deja una declaración ni un lockfile sin verificar.

## TDD: rojo y verde

1. `npm test -- src/domain/import-draft.test.ts` → **RED**, código 1: Vitest no pudo resolver `./import-draft` (módulo aún inexistente).
2. `npm test -- src/domain/import-draft.test.ts` → **GREEN**, código 0: 12/12 pruebas.
3. `npm test -- src/server/nvidia-diet-client.test.ts` → **RED**, código 1: Vitest no pudo resolver `./nvidia-diet-client` (módulo aún inexistente).
4. Primera ejecución tras implementar el cliente → 5/6 pruebas; la excepción `DOMException` del entorno de pruebas no cumplía `instanceof Error`. Se corrigió la clasificación usando `name`.
5. `npm test -- src/server/nvidia-diet-client.test.ts` → **GREEN**, código 0: 6/6 pruebas.
6. `npm test -- src/domain/import-draft.test.ts src/server/nvidia-diet-client.test.ts` → **GREEN**, código 0: 18/18 pruebas, 2 archivos.

Verificación adicional: `npm test` → código 0, 78/78 pruebas en 18 archivos; `npx tsc --noEmit` → código 0; `npm run lint` → código 0; `git diff --check -- .env.example package.json package-lock.json` → código 0.

## Archivos

- `src/domain/import-draft.ts`: valida días, horarios, categorías, acciones, cantidades finitas positivas, confianza, cadenas y límites de ingredientes. Solicita visión cuando hay menos de tres días con comidas, confianza menor que 0.8 o `needsVision`. Convierte los días a fechas desde el `startsOn` actual y genera IDs nuevos sin mutar el plan original.
- `src/domain/import-draft.test.ts`: 12 pruebas de validación, fallback y conversión.
- `src/server/nvidia-diet-client.ts`: construye solicitudes de texto o visión con JSON, timeout y errores seguros. Lee configuración de `process.env` dentro de `analyzeDiet`; envía la clave solo en `Authorization` y no registra datos. El modelo visual predeterminado es `meta/llama-3.2-11b-vision-instruct`, documentado por NVIDIA en https://build.nvidia.com/meta/llama-3.2-11b-vision-instruct. El modelo de texto exige `NVIDIA_TEXT_MODEL` configurado.
- `src/server/nvidia-diet-client.test.ts`: 6 pruebas con `fetch` simulado; ninguna solicitud real.
- `.env.example`: añade nombres vacíos para los dos modelos.
- `package.json` y `package-lock.json`: se retiraron las entradas manuales de `pdfjs-dist` tras la revisión. Task 2 la añadirá mediante una instalación npm exitosa.

## Autorrevisión y limitaciones

- No se abrió ni imprimió `.env.local`; no se usó ninguna clave real ni se hizo una solicitud viva a NVIDIA.
- Los errores del cliente no incorporan cuerpos de respuesta, prompts, páginas, cabeceras ni valores de configuración.
- `draftToPlan` conserva nombre, identificador, fecha de inicio y demás metadatos actuales; `planName` y `startsOn` del borrador quedan disponibles para revisión pero no sustituyen esos metadatos automáticamente.
- `npm install pdfjs-dist` falló con `EAI_AGAIN` al resolver `registry.npmjs.org`. No había entrada de `pdfjs-dist` en la caché npm. La entrada manual de lockfile sin hash de integridad se retiró; Task 2 deberá instalar la dependencia con acceso al registro antes de usarla.
- No se intentó ningún commit: los metadatos Git son de solo lectura para esta tarea.

## Corrección tras revisión — 2026-10-12

- Prueba roja: `npm test -- src/domain/import-draft.test.ts` → código 1, **5 fallos esperados**: se aceptaban claves desconocidas en raíz, día, comida e ingrediente; con inicio de semana en martes, “lunes” se calculaba como miércoles.
- Corrección: `parseImportDraft` comprueba claves permitidas en cada uno de los cuatro niveles. `draftToPlan` toma la fecha validada de `safeWeekStart(current.startsOn)`, calcula el desplazamiento circular según el día real de esa fecha y ordena el resultado cronológicamente. Así “lunes” cae en el lunes siguiente cuando la semana visible empieza en martes.
- Prueba verde: `npm test -- src/domain/import-draft.test.ts` → código 0, **17/17**.
- Verificación final: `npm test` → código 0, **83/83** en 18 archivos; `npx tsc --noEmit` → código 0; `npm run lint` → código 0; `git diff --check -- src/domain/import-draft.ts src/domain/import-draft.test.ts package.json package-lock.json` → código 0.
- `git status --short -- package.json package-lock.json` no muestra cambios. Ninguna entrada de dependencia o integridad fue inventada o sustituida.
