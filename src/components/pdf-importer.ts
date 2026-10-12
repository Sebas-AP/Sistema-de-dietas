import type { TextPage, VisionPage } from '../server/nvidia-diet-client'
import type { PDFDocumentProxy } from 'pdfjs-dist'

function abortable<T>(promise: Promise<T>, signal?: AbortSignal, onAbort?: () => void): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(new DOMException('Se canceló la lectura del PDF', 'AbortError'))
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      try { onAbort?.() } catch { /* The pending operation is already being discarded. */ }
      reject(new DOMException('Se canceló la lectura del PDF', 'AbortError'))
    }
    signal.addEventListener('abort', abort, { once: true })
    promise.then(
      (value) => { signal.removeEventListener('abort', abort); resolve(value) },
      (error) => { signal.removeEventListener('abort', abort); reject(error) },
    )
  })
}

async function withPdf<T>(file: File, signal: AbortSignal | undefined, read: (document: PDFDocumentProxy, signal?: AbortSignal) => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') throw new Error('La lectura del PDF requiere un navegador')
  if (signal?.aborted) throw new DOMException('Se canceló la lectura del PDF', 'AbortError')
  const pdfjs = await abortable(import('pdfjs-dist'), signal)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  const data = new Uint8Array(await abortable(file.arrayBuffer(), signal))
  const loadingTask = pdfjs.getDocument({ data })
  try {
    const document = await abortable(loadingTask.promise, signal)
    return await read(document, signal)
  } finally {
    await loadingTask.destroy()
  }
}

export async function extractTextPages(file: File, signal?: AbortSignal): Promise<TextPage[]> {
  return withPdf(file, signal, async (document) => {
    const pages: TextPage[] = []
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await abortable(document.getPage(number), signal)
      const content = await abortable(page.getTextContent(), signal)
      const text = content.items.map((item) => 'str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : '').join('')
        .replace(/[ \t]*\n[ \t]*/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim()
      pages.push({ number, text })
    }
    return pages
  })
}

export async function renderVisionPages(file: File, maxPages = 2, signal?: AbortSignal): Promise<VisionPage[]> {
  return withPdf(file, signal, async (document) => {
    const pages: VisionPage[] = []
    const count = Math.min(document.numPages, Math.max(0, Math.floor(maxPages)), 2)
    for (let number = 1; number <= count; number += 1) {
      const page = await abortable(document.getPage(number), signal)
      const viewport = page.getViewport({ scale: 150 / 72 })
      const canvas = window.document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      try {
        const rendering = page.render({ canvas, viewport })
        await abortable(rendering.promise, signal, () => rendering.cancel())
        pages.push({ number, dataUrl: canvas.toDataURL('image/png') })
      } finally {
        canvas.width = 0
        canvas.height = 0
      }
    }
    return pages
  })
}
