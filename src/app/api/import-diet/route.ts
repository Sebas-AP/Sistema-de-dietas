import { shouldUseVision } from '../../../domain/import-draft'
import { analyzeDiet } from '../../../server/nvidia-diet-client'
import type { TextImportInput, VisionImportInput } from '../../../server/nvidia-diet-client'

const MAX_TEXT_PAGES = 20
const MAX_TEXT_CHARACTERS = 60_000
const MAX_VISION_PAGES = 2
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_REQUEST_BYTES = 15 * 1024 * 1024
const PNG_PREFIX = 'data:image/png;base64,'
const PNG_SIGNATURE = '\x89PNG\r\n\x1a\n'

class InvalidImportRequest extends Error {
  constructor(readonly status: 400 | 413) {
    super('Invalid import request')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const length = request.headers.get('Content-Length')
  if (length !== null) {
    if (!/^\d+$/.test(length)) throw new InvalidImportRequest(400)
    if (Number(length) > MAX_REQUEST_BYTES) throw new InvalidImportRequest(413)
  }
  if (!request.body) throw new InvalidImportRequest(400)

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_REQUEST_BYTES) throw new InvalidImportRequest(413)
      chunks.push(value)
    }
  } catch (error) {
    if (error instanceof InvalidImportRequest) await reader.cancel().catch(() => undefined)
    throw error
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
}

function pagesFrom(value: unknown, maxPages: number): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0) throw new InvalidImportRequest(400)
  if (value.length > maxPages) throw new InvalidImportRequest(413)
  if (!value.every(isRecord)) throw new InvalidImportRequest(400)
  const pages = value as Record<string, unknown>[]
  const numbers = pages.map((page) => page.number)
  if (numbers.some((number) => !Number.isSafeInteger(number) || (number as number) < 1) ||
    new Set(numbers).size !== numbers.length) throw new InvalidImportRequest(400)
  return pages
}

function parseInput(value: unknown): TextImportInput | VisionImportInput {
  if (!isRecord(value)) throw new InvalidImportRequest(400)
  if (value.mode === 'text') {
    const pages = pagesFrom(value.pages, MAX_TEXT_PAGES)
    if (pages.some((page) => typeof page.text !== 'string')) throw new InvalidImportRequest(400)
    const totalLength = pages.reduce((total, page) => total + (page.text as string).length, 0)
    if (totalLength > MAX_TEXT_CHARACTERS) throw new InvalidImportRequest(413)
    return { mode: 'text', pages: pages.map((page) => ({ number: page.number as number, text: page.text as string })) }
  }
  if (value.mode === 'vision') {
    const pages = pagesFrom(value.pages, MAX_VISION_PAGES)
    for (const page of pages) {
      if (typeof page.dataUrl !== 'string' || !page.dataUrl.startsWith(PNG_PREFIX)) throw new InvalidImportRequest(400)
      const encoded = page.dataUrl.slice(PNG_PREFIX.length)
      const decodedSize = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
      if (decodedSize > MAX_IMAGE_BYTES) throw new InvalidImportRequest(413)
      if (!encoded || encoded.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
        throw new InvalidImportRequest(400)
      }
      if (atob(encoded.slice(0, 12)).slice(0, 8) !== PNG_SIGNATURE) throw new InvalidImportRequest(400)
    }
    return { mode: 'vision', pages: pages.map((page) => ({ number: page.number as number, dataUrl: page.dataUrl as string })) }
  }
  throw new InvalidImportRequest(400)
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: Request): Promise<Response> {
  let input: TextImportInput | VisionImportInput
  try {
    input = parseInput(await readBoundedJson(request))
  } catch (error) {
    return jsonResponse({ error: 'La solicitud de importación no es válida' }, error instanceof InvalidImportRequest ? error.status : 400)
  }

  try {
    const draft = await analyzeDiet(input)
    return jsonResponse({ ...draft, needsVision: shouldUseVision(draft) })
  } catch {
    return jsonResponse({ error: 'No se pudo analizar el documento' }, 502)
  }
}
