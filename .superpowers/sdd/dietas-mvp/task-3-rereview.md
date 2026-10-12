# Re-revisión — Tarea 3, ronda de correcciones 1

Revisión de los cuatro hallazgos de `task-3-review.md` contra los archivos actuales. El workspace no contiene un repositorio Git utilizable, así que no fue posible verificar un diff. No ejecuté pruebas.

## Estado de los hallazgos

1. **Iconos PWA — ADDRESSED.** `src/app/manifest.ts:13-16` declara iconos PNG de 192×192 y 512×512; `public/icons/app-icon-192.png` y `public/icons/app-icon-512.png` existen y `file` confirma ambas dimensiones. El icono SVG también existe. La instalación real en Chromium sigue sin evidencia, como reconoce el reporte de implementación.
2. **Estado de hidratación — ADDRESSED.** `src/state/diet-store.tsx:47-60` mantiene `isHydrated` falso hasta completar la lectura del repositorio. `src/app/page.tsx:103-118` muestra “Cargando tu plan” con `aria-busy` y no renderiza el mensaje de plan vacío durante esa fase.
3. **Semántica y foco de navegación — ADDRESSED.** `src/components/app-navigation.tsx:20-30` presenta botones con `aria-pressed` para identificar la sección elegida. `src/app/page.tsx:74-79,103-117` enfoca `main` tras el cambio y etiqueta la región con el encabezado de la sección activa. Hay una prueba correspondiente en `src/components/app-navigation.test.tsx:30-43`, aunque no fue ejecutada en esta revisión.
4. **Claves de completado al retirar elementos — NOT ADDRESSED completamente.** `src/state/diet-store.tsx:66-73` elimina claves ausentes del mapa en memoria, y `src/state/diet-store.test.tsx:105-128` comprueba que el mismo elemento vuelve sin marcar. Sin embargo, en vez de borrar la clave persistida, se llama `saveCompletion(key, false)`; `src/storage/local-plan-repository.ts:99-102` guarda literalmente `false` en localStorage. El estado viejo ya no puede reaparecer marcado, pero la clave persistida no se poda físicamente. Para satisfacer poda literal hace falta una operación de borrado en el repositorio.

## Regresiones introducidas

No encontré una regresión funcional atribuible a las correcciones al inspeccionar los archivos. La limitación de las suites UI ya estaba documentada y no se volvió a probar.

## Veredicto

Tres hallazgos están abordados; queda pendiente la poda física de claves de completado persistidas. La instalación PWA y el comportamiento de accesibilidad tienen cobertura declarada en el código, pero no verificación de navegador en esta ronda.
