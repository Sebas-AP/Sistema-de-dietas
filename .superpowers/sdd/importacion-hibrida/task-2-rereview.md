# Re-revisión — fix de Task 2

Alcance: verificar únicamente las correcciones de límite del cuerpo HTTP y firma PNG registradas en `task-2-report.md`, junto con las pruebas de regresión asociadas. No ejecuté pruebas, conforme a la instrucción de esta re-revisión.

## Verificación del fix

- **Límite HTTP antes de parsear JSON: correcto.** `readBoundedJson` valida `Content-Length` y responde con error 413 si excede 15 MiB (`src/app/api/import-diet/route.ts:23-28`). Si falta esa cabecera, lee el cuerpo como stream, suma los bytes y corta al superar el mismo máximo (`:31-47`). Solo después de completar una lectura dentro del límite concatena bytes, decodifica y llama a `JSON.parse` (`:49-55`). La ruta llama `parseInput` únicamente con el resultado de esa función (`:99-104`).
- **Firma PNG: correcto.** Tras validar prefijo, tamaño y sintaxis Base64, decodifica el prefijo necesario y compara los primeros ocho bytes con la firma PNG (`src/app/api/import-diet/route.ts:80-89`). La prueba positiva usa el PNG del repositorio (`src/app/api/import-diet/route.test.ts:28-32`); los casos negativos cubren MIME incorrecto, Base64 inválido y Base64 válido que contiene solo `png` (`:65-78`).
- **Cobertura del límite:** la prueba comprueba rechazo por `Content-Length` sobredimensionado y que no se invoque al proveedor (`src/app/api/import-diet/route.test.ts:86-95`); otra entrega un stream sobredimensionado y espera 413 (`:97-111`). El orden del código confirma que ambos rechazos ocurren antes de `JSON.parse`.

## Hallazgos de regresión

No encontré regresiones en los dos fixes revisados. No afirmo que las pruebas pasen: no se ejecutaron en esta re-revisión.

## Veredicto

Los dos hallazgos previos de entrada quedan corregidos según inspección estática. La verificación de ejecución permanece pendiente.
