import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractTextPages, renderVisionPages } from './pdf-importer'
import { getDocument } from 'pdfjs-dist'

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
}))

const file = {
  arrayBuffer: vi.fn(async () => new Uint8Array([37, 80, 68, 70]).buffer),
} as unknown as File

function loadDocument(pages: Array<{ text: string; fail?: boolean }>) {
  const destroy = vi.fn(async () => undefined)
  const getPage = vi.fn(async (number: number) => ({
    getTextContent: vi.fn(async () => {
      if (pages[number - 1].fail) throw new Error('Unreadable page')
      return { items: [{ str: ` ${pages[number - 1].text} ` }] }
    }),
    getViewport: vi.fn(({ scale }: { scale: number }) => ({ width: 100 * scale, height: 200 * scale })),
    render: vi.fn(() => ({ promise: Promise.resolve() })),
  }))
  vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve({ numPages: pages.length, getPage }), destroy } as unknown as ReturnType<typeof getDocument>)
  return { getPage, destroy }
}

describe('local PDF import', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,cG5n')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetAllMocks()
  })

  it('extracts trimmed text in page order and releases the document', async () => {
    const pdf = loadDocument([{ text: 'LUNES' }, { text: 'MARTES' }])
    await expect(extractTextPages(file)).resolves.toEqual([
      { number: 1, text: 'LUNES' },
      { number: 2, text: 'MARTES' },
    ])
    expect(pdf.getPage.mock.calls.map(([number]) => number)).toEqual([1, 2])
    expect(pdf.destroy).toHaveBeenCalledOnce()
  })

  it('releases the document when text extraction fails', async () => {
    const pdf = loadDocument([{ text: 'LUNES', fail: true }])
    await expect(extractTextPages(file)).rejects.toThrow('Unreadable page')
    expect(pdf.destroy).toHaveBeenCalledOnce()
  })

  it('renders only two pages at 150 DPI as ephemeral PNG data URLs', async () => {
    const pdf = loadDocument([{ text: 'LUNES' }, { text: 'MARTES' }, { text: 'MIÉRCOLES' }])
    const pages = await renderVisionPages(file)
    expect(pages).toEqual([
      { number: 1, dataUrl: 'data:image/png;base64,cG5n' },
      { number: 2, dataUrl: 'data:image/png;base64,cG5n' },
    ])
    expect(pdf.getPage.mock.calls.map(([number]) => number)).toEqual([1, 2])
    const firstPage = await pdf.getPage.mock.results[0].value
    expect(firstPage.getViewport).toHaveBeenCalledWith({ scale: 150 / 72 })
    expect(firstPage.render).toHaveBeenCalledWith(expect.objectContaining({ canvas: expect.any(HTMLCanvasElement), viewport: { width: 100 * 150 / 72, height: 200 * 150 / 72 } }))
    expect(pdf.destroy).toHaveBeenCalledOnce()
  })

  it('honors a smaller page limit', async () => {
    const pdf = loadDocument([{ text: 'LUNES' }, { text: 'MARTES' }])
    await expect(renderVisionPages(file, 1)).resolves.toHaveLength(1)
    expect(pdf.getPage).toHaveBeenCalledTimes(1)
  })

  it('aborts a pending text read and destroys the PDF', async () => {
    const controller = new AbortController()
    const destroy = vi.fn(async () => undefined)
    const getTextContent = vi.fn(() => new Promise(() => undefined))
    const getPage = vi.fn(async () => ({ getTextContent }))
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage }), destroy } as unknown as ReturnType<typeof getDocument>)
    const extraction = extractTextPages(file, controller.signal)
    await vi.waitFor(() => expect(getTextContent).toHaveBeenCalledOnce())
    controller.abort()
    await expect(extraction).rejects.toMatchObject({ name: 'AbortError' })
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('cancels an active page render and destroys the PDF', async () => {
    const controller = new AbortController()
    const destroy = vi.fn(async () => undefined)
    const cancel = vi.fn()
    const render = vi.fn(() => ({ promise: new Promise(() => undefined), cancel }))
    const getPage = vi.fn(async () => ({ getViewport: () => ({ width: 100, height: 100 }), render }))
    vi.mocked(getDocument).mockReturnValue({ promise: Promise.resolve({ numPages: 1, getPage }), destroy } as unknown as ReturnType<typeof getDocument>)
    const rendering = renderVisionPages(file, 2, controller.signal)
    await vi.waitFor(() => expect(render).toHaveBeenCalledOnce())
    controller.abort()
    await expect(rendering).rejects.toMatchObject({ name: 'AbortError' })
    expect(cancel).toHaveBeenCalledOnce()
    expect(destroy).toHaveBeenCalledOnce()
  })
})
