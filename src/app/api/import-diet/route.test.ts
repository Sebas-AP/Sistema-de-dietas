import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { POST } from './route'
import { analyzeDiet } from '../../../server/nvidia-diet-client'

vi.mock('../../../server/nvidia-diet-client', () => ({ analyzeDiet: vi.fn() }))

const readyDraft = {
  planName: 'Menú',
  days: [
    { weekday: 'monday', meals: [{ slot: 'breakfast', title: 'Avena', ingredients: [] }] },
    { weekday: 'tuesday', meals: [{ slot: 'breakfast', title: 'Fruta', ingredients: [] }] },
    { weekday: 'wednesday', meals: [{ slot: 'breakfast', title: 'Yogur', ingredients: [] }] },
  ],
  confidence: 0.9,
  needsVision: false,
  warnings: [],
}

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/import-diet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const textPage = { number: 1, text: 'LUNES' }
const visionPage = {
  number: 1,
  dataUrl: `data:image/png;base64,${readFileSync('public/icons/app-icon-192.png').toString('base64')}`,
}

describe('POST /api/import-diet', () => {
  afterEach(() => vi.resetAllMocks())

  it('returns a no-store draft without echoing source text', async () => {
    vi.mocked(analyzeDiet).mockResolvedValue(readyDraft as Awaited<ReturnType<typeof analyzeDiet>>)
    const response = await POST(jsonRequest({ mode: 'text', pages: [textPage] }))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const raw = await response.text()
    expect(JSON.parse(raw)).toEqual(readyDraft)
    expect(raw).not.toContain('LUNES')
  })

  it('computes fallback from draft confidence even when provider says no', async () => {
    vi.mocked(analyzeDiet).mockResolvedValue({ ...readyDraft, confidence: 0.7 } as Awaited<ReturnType<typeof analyzeDiet>>)
    const response = await POST(jsonRequest({ mode: 'text', pages: [textPage] }))
    expect(await response.json()).toMatchObject({ needsVision: true })
  })

  it.each([
    { mode: 'text', pages: Array.from({ length: 21 }, (_, i) => ({ number: i + 1, text: 'x' })) },
    { mode: 'text', pages: [{ number: 1, text: 'x'.repeat(60_001) }] },
    { mode: 'vision', pages: [visionPage, { ...visionPage, number: 2 }, { ...visionPage, number: 3 }] },
    { mode: 'vision', pages: [{ number: 1, dataUrl: `data:image/png;base64,${'A'.repeat(6_990_508)}` }] },
  ])('returns 413 for excessive page data', async (body) => {
    const response = await POST(jsonRequest(body))
    expect(response.status).toBe(413)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(analyzeDiet).not.toHaveBeenCalled()
  })

  it.each([
    {},
    { mode: 'text', pages: [] },
    { mode: 'text', pages: [{ number: 0, text: 'LUNES' }] },
    { mode: 'text', pages: [{ number: 1, text: 42 }] },
    { mode: 'vision', pages: [{ number: 1, dataUrl: 'data:image/jpeg;base64,cG5n' }] },
    { mode: 'vision', pages: [{ number: 1, dataUrl: 'data:image/png;base64,not-base64!' }] },
    { mode: 'vision', pages: [{ number: 1, dataUrl: 'data:image/png;base64,cG5n' }] },
  ])('returns 400 for malformed input', async (body) => {
    const response = await POST(jsonRequest(body))
    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(analyzeDiet).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid JSON', async () => {
    const response = await POST(new Request('http://localhost/api/import-diet', { method: 'POST', body: '{' }))
    expect(response.status).toBe(400)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('rejects an excessive Content-Length before reading the body', async () => {
    const request = jsonRequest({ mode: 'text', pages: [textPage] })
    request.headers.set('Content-Length', String(16 * 1024 * 1024))
    const readSpy = vi.spyOn(request, 'json')
    const response = await POST(request)
    expect(response.status).toBe(413)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(readSpy).not.toHaveBeenCalled()
    expect(analyzeDiet).not.toHaveBeenCalled()
  })

  it('stops reading a streamed body once its byte limit is exceeded', async () => {
    let pulls = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1
        if (pulls === 1) controller.enqueue(new Uint8Array(16 * 1024 * 1024))
        else controller.error(new Error('Body continued beyond the limit'))
      },
    })
    const request = new Request('http://localhost/api/import-diet', { method: 'POST', body, duplex: 'half' } as RequestInit & { duplex: 'half' })
    const response = await POST(request)
    expect(response.status).toBe(413)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(analyzeDiet).not.toHaveBeenCalled()
  })

  it('returns a safe 502 without provider internals', async () => {
    vi.mocked(analyzeDiet).mockRejectedValue(new Error('secret provider details'))
    const response = await POST(jsonRequest({ mode: 'vision', pages: [visionPage] }))
    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const text = await response.text()
    expect(text).not.toContain('secret provider details')
    expect(text).not.toContain(visionPage.dataUrl)
  })
})
