# Importación híbrida de dietas con IA - Diseño

## Objetivo

Permitir importar un menú semanal desde un PDF y convertirlo en un borrador
editable de `DietPlan`. El sistema debe privilegiar una extracción de texto
de bajo costo y usar visión únicamente cuando el análisis no pueda producir
un plan estructurado confiable.

La importación no sustituye la revisión nutricional. Nunca guarda el PDF ni
modifica el plan actual hasta que la persona revisa y confirma el borrador.

## Alcance

- El usuario selecciona un PDF de hasta 10 MB en la vista Semana.
- Antes de procesarlo, acepta un aviso claro: texto y, si hace falta, imágenes
  de sus páginas se enviarán desde la app a NVIDIA para extraer el menú.
- El navegador extrae texto por página con `pdfjs-dist`.
- El navegador envía el texto extraído a una ruta de servidor de Next.js.
- El servidor usa `NVIDIA_API_KEY`, que nunca se devuelve al navegador, y
  solicita JSON con días, comidas, ingredientes y niveles de confianza.
- Si el JSON es válido, contiene al menos tres días con al menos una comida,
  y la confianza global es `>= 0.8`, se muestra el editor de revisión.
- Si no cumple estas condiciones, el navegador renderiza las páginas a PNG,
  con un máximo de dos páginas y 150 DPI, y solicita una segunda extracción
  visual al mismo endpoint.
- El usuario edita el borrador, puede cancelar, o confirma “Importar al plan”.
  Solo esa confirmación reemplaza el plan en localStorage.

## Fuera de alcance

- Conservar archivos PDF, imágenes de páginas, prompts o resultados en la
  base de datos.
- Recomendaciones clínicas, sustituciones automáticas o cálculo de calorías.
- Procesar más de dos páginas por visión en una solicitud inicial. Un menú
  mayor deberá importarse en bloques en una entrega posterior.
- OCR para imágenes dentro de PDFs sin texto cuando el fallback visual no
  logra suficiente confianza.

## Flujo y privacidad

1. Selección del PDF local.
2. Modal de consentimiento con destinatario (NVIDIA), propósito y los datos
   transmitidos. Cancelar conserva el archivo solo en memoria del navegador.
3. Extracción textual local y llamada `POST /api/import-diet` con
   `{ mode: 'text', pages: [{ number, text }] }`.
4. El servidor valida tamaño/cantidad, llama a NVIDIA desde el entorno de
   ejecución y devuelve un borrador o `needsVision: true`.
5. En fallback, el navegador genera PNGs efímeros de las primeras dos páginas
   y llama a la misma ruta con `{ mode: 'vision', pages: [{ number, dataUrl }] }`.
6. El usuario revisa la información; “Importar” guarda localmente y “Cancelar”
   descarta todo el borrador.

El navegador nunca recibe `NVIDIA_API_KEY`. La ruta no escribe archivos y
envía cabeceras `Cache-Control: no-store`. La interfaz informa errores de
archivo, red, límite, JSON inválido o proveedor no disponible sin revelar
respuestas internas o secretos.

## Arquitectura

### Cliente

- `pdf-importer.ts`: carga el PDF, extrae texto y renderiza páginas solo cuando
  se activa el fallback.
- `import-diet-dialog.tsx`: consentimiento, progreso, errores y editor de
  revisión.
- `diet-draft.ts`: convierte la respuesta validada a `DietPlan` sin mutar el
  estado actual.

### Servidor

- `app/api/import-diet/route.ts`: valida el cuerpo y delega el análisis.
- `server/nvidia-diet-client.ts`: construye solicitudes OpenAI-compatibles a
  `https://integrate.api.nvidia.com/v1/chat/completions` usando
  `process.env.NVIDIA_API_KEY`.
- `server/import-schema.ts`: valida estrictamente el JSON de la IA, limita
  texto, páginas, ingredientes y longitudes.

El prompt exige JSON solamente, no inventar cantidades, marcar confianza por
campo y usar `null` cuando el PDF no sea legible. El modelo se configura por
`NVIDIA_MODEL`; el valor por defecto debe ser un modelo de visión compatible
documentado por NVIDIA. La llamada textual usa un modelo de texto compatible
configurable por `NVIDIA_TEXT_MODEL`.

## Contrato de respuesta

```ts
type ImportDraft = {
  planName: string
  startsOn?: string
  days: Array<{
    weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
    meals: Array<{
      slot: MealSlot
      title: string
      time?: string
      ingredients: Array<{ name: string; quantity?: number; unit?: string; category: GroceryCategory; preparationAction?: PreparationAction }>
    }>
  }>
  confidence: number
  needsVision: boolean
  warnings: string[]
}
```

El servidor solo acepta respuesta estructurada que satisfaga este contrato;
si NVIDIA responde texto no parseable, devuelve un error controlado y nunca
persiste contenido.

## Validación y pruebas

- Unitarias: validación de cuerpo, conversión de borrador, criterio de
  fallback, límites de datos y respuestas malformadas.
- Ruta: llamada a NVIDIA simulada; verificar que no se filtra la clave,
  `Cache-Control: no-store`, y errores 400/413/502 manejados.
- Componente: consentimiento obligatorio, mostrar progreso, revisar/cancelar,
  e importar únicamente tras confirmación.
- E2E: importar una respuesta simulada desde texto y confirmar que aparece en
  Semana; cubrir fallback de visión sin llamar a NVIDIA real.

## Configuración de despliegue

- Local: `NVIDIA_API_KEY`, `NVIDIA_TEXT_MODEL`, `NVIDIA_MODEL` en `.env.local`.
- Vercel: las mismas variables como secretos de Production, Preview y
  Development según corresponda.
- `.env.local` se mantiene ignorado; `.env.example` contiene nombres, nunca
  valores.
