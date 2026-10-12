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

### Importar un menú desde PDF

En **Semana**, pulsa **Importar desde PDF** y selecciona un archivo de hasta 10 MB. La app solicita tu consentimiento antes de leerlo y enviar el texto a NVIDIA. Si el texto no basta, también envía imágenes de hasta dos páginas. Revisa y corrige el borrador; el plan actual solo se reemplaza cuando pulsas **Importar al plan**. Cancelar descarta el archivo y el borrador que estaban en memoria.

Para usar la importación en local, copia `.env.example` a `.env.local` y configura estas variables solo en el servidor:

| Variable | Uso |
| --- | --- |
| `NVIDIA_API_KEY` | Clave de NVIDIA para el endpoint de análisis. |
| `NVIDIA_TEXT_MODEL` | Modelo compatible para la extracción inicial de texto; es obligatorio. |
| `NVIDIA_MODEL` | Modelo compatible con visión para el respaldo por imágenes. Si se omite, se usa `meta/llama-3.2-11b-vision-instruct`. |

En Vercel, configura las mismas variables en **Project Settings → Environment Variables** para los entornos Production, Preview y Development que utilices. No expongas la clave con el prefijo `NEXT_PUBLIC_` ni la incluyas en el repositorio.

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

El plan y las casillas se guardan en `localStorage` del navegador actual. No hay cuenta, sincronización, respaldo ni enlaces de acceso persistentes: borrar los datos del sitio elimina el plan. **PDF de referencia** guarda únicamente nombre y tamaño. La importación con IA es una acción separada: después del consentimiento, transmite el texto y, si se necesita, imágenes de hasta dos páginas a NVIDIA. El PDF, las imágenes y el borrador no se conservan en el servidor ni en el almacenamiento local. Revisa el resultado antes de importarlo; la app no ofrece diagnóstico ni recomendaciones clínicas. Al compartir, la app entrega un resumen de texto a la función de compartir del dispositivo o permite copiarlo; revisa el contenido antes de enviarlo. Los recordatorios aparecen solo mientras la app está abierta.

## Próximas etapas

La siguiente etapa contempla cuentas, almacenamiento persistente y enlaces compartidos revocables. Después se prevén OCR adicional para PDFs difíciles, sustituciones basadas en un catálogo revisado por profesionales, y notificaciones del sistema.
