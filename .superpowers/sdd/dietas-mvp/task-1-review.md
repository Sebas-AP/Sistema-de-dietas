# Revisión independiente — Task 1

## Veredicto de especificación: cambios necesarios

Los tipos y las dos funciones exigidas existen. `PreparationAction` se limita a `wash | cut | cook | prep` (`src/domain/types.ts:5`); la preparación omite ingredientes sin acción e incluye la fecha del día (`src/domain/plan-derivations.ts:42-47`). Compras conserva el primer nombre recortado, normaliza el nombre con `toLocaleLowerCase('es-MX')`, separa unidades distintas y ordena por categoría y nombre (`src/domain/plan-derivations.ts:9-11,31-33`). El manifiesto contiene los seis scripts solicitados y las dependencias declaradas; Vitest configura `jsdom`, el archivo de preparación y el glob requeridos (`package.json:5-12`, `vitest.config.ts:4-6`). No hay API, cuenta ni carga externa en los archivos de esta tarea. La UI en español aún no forma parte de Task 1.

Hay una infracción del contrato «sumar solo cuando coinciden nombre, categoría y unidad»: la clave concatena campos libres con `:` (`src/domain/plan-derivations.ts:11`). Por ejemplo, `name='A:B', unit='C'` y `name='A', unit='B:C'` en la misma categoría producen la misma clave y se suman aunque ni el nombre ni la unidad coincidan. Se debe usar una clave sin colisiones (por ejemplo, una tupla serializada) y añadir una prueba de regresión. Responsable: desarrollo de dominio / `backend-developer`.

El paso de commit del brief no se realizó porque `.git` no es un repositorio utilizable. Esto consta en el informe de implementación y se confirma por el directorio `.git` vacío; no equivale a un commit entregado.

## Veredicto de calidad: cambios y verificación pendientes

| Etapa / evidencia disponible | Estado | Límite |
| --- | --- | --- |
| RED: `npm test -- src/domain/plan-derivations.test.ts` | No ejecutable; exit 127, `vitest: command not found` | No demuestra una prueba de comportamiento fallida. |
| RED alternativo: Vitest 3.2.7 ajeno al proyecto, entorno Node | Falló por módulo ausente, 0 pruebas ejecutadas | Acredita que los tests precedieron al módulo, pero no una aserción roja. |
| GREEN alternativo: mismo Vitest ajeno, entorno Node | 4/4 pruebas pasaron, según `task-1-report.md` | Valida la lógica pura cubierta por esas pruebas; no valida `vitest.config.ts`, `jsdom` ni el script del proyecto. |
| TypeScript directo de los dos módulos de dominio | Exit 0, según `task-1-report.md` | No es un typecheck completo del proyecto. |
| `npm install`, `npm test` configurado, lint, build, E2E | Sin pase verificable | Instalación bloqueada por `EAI_AGAIN` y caché incompleta; no existe lockfile ni `node_modules` local. |

La evidencia de TDD es parcial: el informe describe escritura de tests antes de la implementación y un fallo por módulo ausente seguido de cuatro pruebas verdes con runner alternativo. No hay salida de un ciclo RED de aserción ni GREEN del comando solicitado. No se repitieron pruebas durante esta revisión, conforme al encargo.

### Hallazgos

1. **Alta — colisión de claves de compras** (`src/domain/plan-derivations.ts:11`). Agrega productos diferentes bajo la misma fila cuando nombre y unidad contienen `:`. Afecta cantidades y la clave usada después para estado de compra. Responsable: desarrollo de dominio / `backend-developer`.
2. **Media — falta prueba del criterio completo de agrupación** (`src/domain/plan-derivations.test.ts:22-44`). Las pruebas cubren nombre con mayúsculas/espacios y unidades diferentes, pero no categorías distintas con el mismo nombre y unidad, ni claves con delimitadores. La regresión anterior puede pasar toda la suite actual. Responsable: pruebas de dominio / `backend-developer` (o `react-test-writer` solo si se traslada a UI).
3. **Media — entorno y pipeline sin pase reproducible** (`package.json:5-12`, `vitest.config.ts:4-6`). Las dependencias están declaradas, pero la instalación falló y no hay lockfile. El GREEN alternativo no cubre la configuración real de `jsdom`; lint y build siguen sin evidencia. Responsable: mantenimiento de dependencias/CI / `ci-reviewer`, una vez disponible el registro de paquetes. No se debe marcar esta etapa como verde.

La unidad se recorta pero se conserva sensible a mayúsculas (`src/domain/plan-derivations.ts:10-11`). El brief exige explícitamente normalizar *nombres*, no declara que `kg` y `KG` sean equivalentes. Por eso no se clasifica como incumplimiento; conviene decidir y probar esa regla antes de cambiarla.

## Decisión del gate

**No listo para integrar:** existe una colisión que puede sumar cantidades incompatibles y el script de pruebas, lint y build reales carecen de pase verificable. Corregir la clave y su prueba, instalar dependencias y ejecutar el pipeline configurado antes de aprobar.
