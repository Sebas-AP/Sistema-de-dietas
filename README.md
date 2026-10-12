# Mi dieta semanal

Aplicación web para capturar un menú semanal, organizar compras y preparación, y marcar tareas completadas. Funciona en un solo navegador, sin cuenta.

## Requisitos

- Node.js 20 o posterior y npm.
- Para la prueba de navegador, Chromium y sus dependencias de sistema. Instálalos con `npx playwright install --with-deps chromium`.

## Uso local

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:3000`. En **Semana**, elige un día, agrega una comida y registra sus alimentos. **Compras** agrupa los alimentos; **Preparación** muestra los que tienen una acción asignada. Las casillas conservan su estado en el navegador.

## Pruebas y compilación

```bash
npm test
npm run lint
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```

Playwright inicia el servidor de desarrollo para la prueba E2E. Si usas un Chromium de sistema cuando la descarga de Playwright no está disponible, ejecuta `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/ruta/a/chromium npm run test:e2e`.

## Privacidad y límites

El plan y las casillas se guardan en `localStorage` del navegador actual. No hay cuenta, sincronización, respaldo ni enlaces de acceso persistentes: borrar los datos del sitio elimina el plan. El selector de PDF valida archivos de hasta 10 MB, pero guarda únicamente su nombre y tamaño; no conserva ni interpreta el contenido. Al compartir, la app entrega un resumen de texto a la función de compartir del dispositivo o permite copiarlo; revisa el contenido antes de enviarlo. Los recordatorios aparecen solo mientras la app está abierta. La app no ofrece diagnóstico ni recomendaciones clínicas.

## Próximas etapas

La siguiente etapa contempla cuentas, almacenamiento persistente y enlaces compartidos revocables. Después se prevén lectura de PDF con OCR y confirmación humana, sustituciones basadas en un catálogo revisado por profesionales, y notificaciones del sistema.
