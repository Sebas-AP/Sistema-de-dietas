import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeDiet } from './nvidia-diet-client'

const textInput = { mode: 'text' as const, pages: [{ number: 1, text: 'LUNES: COMIDA pollo' }] }
const providerDraft = {
  planName: 'Menú',
  days: [{ weekday: 'monday', meals: [{ slot: 'mainMeal', title: 'Pollo', ingredients: [{ name: 'Pollo', category: 'protein' }] }] }],
  confidence: 0.9,
  needsVision: false,
  warnings: [],
}

function providerResponse(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 })
}

describe('analyzeDiet', () => {
  beforeEach(() => {
    vi.stubEnv('NVIDIA_API_KEY', 'test-key')
    vi.stubEnv('NVIDIA_TEXT_MODEL', 'test-text-model')
    vi.stubEnv('NVIDIA_MODEL', 'test-vision-model')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends the key only as a server bearer header and parses the draft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse(JSON.stringify(providerDraft)))
    vi.stubGlobal('fetch', fetchMock)

    await expect(analyzeDiet(textInput)).resolves.toMatchObject(providerDraft)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions')
    expect(options.headers).toMatchObject({ Authorization: 'Bearer test-key', 'Content-Type': 'application/json' })
    expect(options.body).not.toContain('test-key')
    expect(JSON.parse(options.body as string)).toMatchObject({ model: 'test-text-model', stream: false, temperature: 0.1, response_format: { type: 'json_object' } })
  })

  it('uses a vision content part and the vision model for image input', async () => {
    const fetchMock = vi.fn().mockResolvedValue(providerResponse(JSON.stringify(providerDraft)))
    vi.stubGlobal('fetch', fetchMock)
    const dataUrl = 'data:image/png;base64,cG5n'

    await analyzeDiet({ mode: 'vision', pages: [{ number: 1, dataUrl }] })

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body.model).toBe('test-vision-model')
    expect(body.messages[1].content).toContainEqual({ type: 'image_url', image_url: { url: dataUrl } })
  })

  it('throws a safe configuration error when the key is absent without making a request', async () => {
    vi.stubEnv('NVIDIA_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(analyzeDiet(textInput)).rejects.toThrow('El servicio de importación no está configurado')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports provider failure without exposing the response body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret internal detail', { status: 503 })))
    await expect(analyzeDiet(textInput)).rejects.toThrow('El servicio de importación no está disponible')
  })

  it('reports malformed JSON as a controlled error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(providerResponse('not-json')))
    await expect(analyzeDiet(textInput)).rejects.toThrow('La respuesta del servicio de importación no es válida')
  })

  it('reports a timeout without exposing technical details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('request detail', 'TimeoutError')))
    await expect(analyzeDiet(textInput)).rejects.toThrow('El servicio de importación tardó demasiado')
  })
})
