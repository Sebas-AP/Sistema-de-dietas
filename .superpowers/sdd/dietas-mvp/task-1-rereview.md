# Re-revisión — Task 1, ronda de fix 1

## Resultado

El hallazgo de colisión de claves está **ADDRESSED**. No encontré breakage nuevo introducido por este fix en el alcance revisado. Las pruebas de respaldo disponibles pasan; el comando de pruebas del proyecto continúa bloqueado porque no está instalado Vitest localmente.

## Hallazgos originales

| Hallazgo | Estado | Evidencia |
| --- | --- | --- |
| Colisión por concatenar categoría, nombre y unidad con `:` (`plan-derivations.ts:11` en la revisión original) | **ADDRESSED** | `src/domain/plan-derivations.ts:11` genera la clave con `JSON.stringify([category, nombre normalizado, unidad])`, que preserva los límites de los campos. La prueba `src/domain/plan-derivations.test.ts:46-59` cubre el par que colisionaba (`A:B`/`C` y `A`/`b:C`) y comprueba que ambos renglones y sus claves se mantengan distintos. La prueba `:61-71` confirma además que categorías distintas no se agrupen. |
| Cobertura insuficiente para categorías distintas y delimitadores | **ADDRESSED** | Las dos regresiones anteriores están cubiertas por pruebas explícitas en `src/domain/plan-derivations.test.ts:46-71`. |
| Entorno sin instalación/pipeline reproducible | **NO ES UN DEFECTO DE CÓDIGO DE ESTE FIX; SIGUE BLOQUEADO** | En esta revisión, `npm test -- src/domain/plan-derivations.test.ts` terminó con exit 127 y `sh: 1: vitest: command not found`. El runner alternativo pasa, pero no valida el script ni el entorno jsdom configurado por el proyecto. |

## Verificación de la ronda

- `node /home/sebastian/Proyectos/Sistema_Gorditas/node_modules/vitest/vitest.mjs run --config .superpowers/sdd/dietas-mvp/vitest-node.config.mjs`: **PASS**, 1 archivo, 6 pruebas.
- `/home/sebastian/Proyectos/Sistema_Gorditas/node_modules/.bin/tsc --noEmit --noResolve --skipLibCheck --lib esnext,dom --target es2017 --module esnext src/domain/types.ts src/domain/plan-derivations.ts`: **PASS**, exit 0. Es una comprobación directa de los módulos de dominio, no un typecheck completo del proyecto.
- `npm test -- src/domain/plan-derivations.test.ts`: **BLOQUEADO**, exit 127 (`vitest: command not found`). Esto es un bloqueo del entorno/dependencias, no evidencia de fallo de código ni un pase del pipeline real.

## Breakage introducido por el fix

No se observó ninguno en el alcance de `src/domain/plan-derivations.ts` y sus pruebas. El formato visible de `ShoppingItem.key` cambió de una cadena delimitada por dos puntos a JSON (`["protein","pollo","pieza"]`); las aserciones de pruebas que esperaban el formato anterior se actualizaron. La clave es un identificador opaco del modelo, y no hay consumidores adicionales de este campo en los archivos disponibles de Task 1. El directorio `.git` está vacío/no es un repositorio utilizable, así que no fue posible verificar un diff Git ni buscar consumidores fuera del alcance disponible.

## Veredicto

**Fix aprobado en revisión de código; gate general aún no verificable.** La regresión fue corregida y está cubierta. El pase del comando de prueba configurado por el proyecto sigue pendiente de una instalación funcional de dependencias.
