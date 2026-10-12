import { parseImportDraft } from '../domain/import-draft'
import type { ImportDraft } from '../domain/import-draft'

export type TextPage = { number: number; text: string }
export type VisionPage = { number: number; dataUrl: string }
export type TextImportInput = { mode: 'text'; pages: TextPage[] }
export type VisionImportInput = { mode: 'vision'; pages: VisionPage[] }

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions'
const DEFAULT_VISION_MODEL = 'meta/llama-3.2-11b-vision-instruct'
const CONFIGURATION_ERROR = 'El servicio de importación no está configurado'
const PROVIDER_ERROR = 'El servicio de importación no está disponible'
const TIMEOUT_ERROR = 'El servicio de importación tardó demasiado'
const RESPONSE_ERROR = 'La respuesta del servicio de importación no es válida'

const SYSTEM_PROMPT = `Extrae un menú semanal del documento del usuario. Responde exclusivamente un objeto JSON, sin Markdown ni texto adicional.
Formato exacto: {"planName":"string","startsOn":"YYYY-MM-DD opcional","days":[{"weekday":"monday|tuesday|wednesday|thursday|friday|saturday|sunday","meals":[{"slot":"breakfast|lunch|morningSnack|mainMeal|afternoonSnack|dinner","title":"string","time":"string opcional","ingredients":[{"name":"string","quantity":1,"unit":"string opcional","category":"produce|protein|dairy|pantry|other","preparationAction":"wash|cut|cook|prep opcional"}]}]}],"confidence":0.0,"needsVision":false,"warnings":[]}.
No inventes ingredientes ni cantidades. Omite los campos opcionales cuando no sean legibles y explica las dudas en warnings. Si no puedes identificar un día o comida, no lo inventes. Usa confidence entre 0 y 1; marca needsVision true si falta texto o el contenido no es confiable. Los nombres y títulos tienen máximo 160 caracteres; cada comida tiene máximo 30 ingredientes.`

function userContent(input: TextImportInput | VisionImportInput) {
  if (input.mode === 'text') {
    return input.pages.map((page) => `Página ${page.number}:\n${page.text}`).join('\n\n')
  }
  return [
    { type: 'text', text: 'Extrae el menú de estas páginas en orden. Devuelve solo JSON.' },
    ...input.pages.flatMap((page) => [
      { type: 'text', text: `Página ${page.number}` },
      { type: 'image_url', image_url: { url: page.dataUrl } },
    ]),
  ]
}

export async function analyzeDiet(input: TextImportInput | VisionImportInput): Promise<ImportDraft> {
  const key = process.env.NVIDIA_API_KEY?.trim()
  const model = input.mode === 'text'
    ? process.env.NVIDIA_TEXT_MODEL?.trim()
    : process.env.NVIDIA_MODEL?.trim() || DEFAULT_VISION_MODEL
  if (!key || !model) throw new Error(CONFIGURATION_ERROR)

  const payload = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent(input) },
    ],
    stream: false,
    temperature: 0.1,
    max_tokens: 4096,
    ...(input.mode === 'text' ? { response_format: { type: 'json_object' } } : {}),
  }

  let response: Response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(TIMEOUT_ERROR)
    }
    throw new Error(PROVIDER_ERROR)
  }
  if (!response.ok) throw new Error(PROVIDER_ERROR)

  try {
    const envelope: unknown = await response.json()
    if (typeof envelope !== 'object' || envelope === null || !('choices' in envelope)) throw new TypeError()
    const choices = (envelope as { choices: unknown }).choices
    if (!Array.isArray(choices) || typeof choices[0]?.message?.content !== 'string') throw new TypeError()
    return parseImportDraft(JSON.parse(choices[0].message.content))
  } catch {
    throw new Error(RESPONSE_ERROR)
  }
}
