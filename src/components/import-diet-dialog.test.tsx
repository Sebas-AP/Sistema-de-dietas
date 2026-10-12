import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportDraft } from '../domain/import-draft'
import type { DietPlan } from '../domain/types'
import { DietProvider } from '../state/diet-store'
import { LocalPlanRepository } from '../storage/local-plan-repository'
import { extractTextPages, renderVisionPages } from './pdf-importer'
import { ImportDietDialog } from './import-diet-dialog'

vi.mock('./pdf-importer', () => ({ extractTextPages: vi.fn(), renderVisionPages: vi.fn() }))

const repository = new LocalPlanRepository()
const pdfFile = new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' })
const currentPlan: DietPlan = {
  id: 'local-plan', name: 'Plan actual', startsOn: '2026-10-12',
  days: [{ date: '2026-10-12', meals: [{ id: 'old', slot: 'breakfast', title: 'Avena', ingredients: [] }] }],
}
const draft: ImportDraft = {
  planName: 'Menú importado', confidence: 0.94, needsVision: false, warnings: ['Revisa las porciones'],
  days: [
    { weekday: 'monday', meals: [{ slot: 'lunch', title: 'Pollo con verduras', ingredients: [{ name: 'Pollo', category: 'protein' }] }] },
    { weekday: 'tuesday', meals: [{ slot: 'dinner', title: 'Sopa', ingredients: [] }] },
    { weekday: 'wednesday', meals: [{ slot: 'breakfast', title: 'Fruta', ingredients: [] }] },
  ],
}

function mount(onClose = vi.fn()) {
  render(<DietProvider repository={repository}><ImportDietDialog onClose={onClose} /></DietProvider>)
  return onClose
}

async function selectAndAccept() {
  await userEvent.upload(screen.getByLabelText('PDF para importar'), pdfFile)
  await userEvent.click(screen.getByLabelText(/Acepto enviar/i))
}

async function analyze() {
  await selectAndAccept()
  await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
  await screen.findByRole('heading', { name: 'Revisar borrador' })
}

describe('ImportDietDialog', () => {
  beforeEach(() => {
    localStorage.clear()
    repository.save(currentPlan)
    vi.mocked(extractTextPages).mockReset().mockResolvedValue([{ number: 1, text: 'menú de la semana' }])
    vi.mocked(renderVisionPages).mockReset().mockResolvedValue([{ number: 1, dataUrl: 'data:image/png;base64,abc' }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(draft)))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('requires consent before extracting text or calling the API', async () => {
    mount()
    await userEvent.upload(screen.getByLabelText('PDF para importar'), pdfFile)
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    expect(extractTextPages).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    await userEvent.click(screen.getByLabelText(/Acepto enviar/i))
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    await screen.findByRole('heading', { name: 'Revisar borrador' })
    expect(extractTextPages).toHaveBeenCalledWith(pdfFile, expect.any(AbortSignal))
    expect(fetch).toHaveBeenCalledWith('/api/import-diet', expect.objectContaining({ method: 'POST' }))
  })

  it('keeps the saved plan intact until confirmation and imports reviewed edits', async () => {
    mount()
    await analyze()
    expect(repository.load()).toEqual(currentPlan)
    await userEvent.clear(screen.getByLabelText('Nombre del plan importado'))
    await userEvent.type(screen.getByLabelText('Nombre del plan importado'), 'Plan revisado')
    await userEvent.clear(screen.getByLabelText('Comida · lunes · 1'))
    await userEvent.type(screen.getByLabelText('Comida · lunes · 1'), 'Pollo al horno')
    await userEvent.clear(screen.getByLabelText('Ingrediente · lunes · 1 · 1'))
    await userEvent.type(screen.getByLabelText('Ingrediente · lunes · 1 · 1'), 'Pechuga de pollo')
    await userEvent.click(screen.getByRole('button', { name: 'Importar al plan' }))
    expect(repository.load().name).toBe('Plan revisado')
    expect(repository.load().days[0].meals[0].title).toBe('Pollo al horno')
    expect(repository.load().days[0].meals[0].ingredients[0].name).toBe('Pechuga de pollo')
    expect(repository.load().days.some((day) => day.meals.some((meal) => meal.title === 'Avena'))).toBe(false)
  })

  it('discards the draft and file on cancellation', async () => {
    const onClose = mount()
    await analyze()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar importación' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(repository.load()).toEqual(currentPlan)
  })

  it('renders pages only after the text endpoint requests vision', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...draft, needsVision: true }))
      .mockResolvedValueOnce(Response.json(draft))
    mount()
    await analyze()
    expect(renderVisionPages).toHaveBeenCalledWith(pdfFile, 2, expect.any(AbortSignal))
    const calls = vi.mocked(fetch).mock.calls
    expect(JSON.parse(String(calls[0][1]?.body)).mode).toBe('text')
    expect(JSON.parse(String(calls[1][1]?.body)).mode).toBe('vision')
  })

  it('blocks import when vision still reports insufficient confidence', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...draft, needsVision: true }))
      .mockResolvedValueOnce(Response.json({ ...draft, confidence: 0.64, needsVision: true }))
    mount()
    await selectAndAccept()
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no fue suficiente/i)
    expect(screen.queryByRole('button', { name: 'Importar al plan' })).not.toBeInTheDocument()
    expect(repository.load()).toEqual(currentPlan)
  })

  it('blocks import when visual extraction finds fewer than three days with meals', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ ...draft, needsVision: true }))
      .mockResolvedValueOnce(Response.json({ ...draft, days: draft.days.slice(0, 1), needsVision: false }))
    mount()
    await selectAndAccept()
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/no fue suficiente/i)
    expect(screen.queryByRole('button', { name: 'Importar al plan' })).not.toBeInTheDocument()
    expect(repository.load()).toEqual(currentPlan)
  })

  it('keeps keyboard focus inside the dialog and closes on Escape', async () => {
    const onClose = vi.fn()
    const { container, unmount } = render(<div><button type="button">Fondo</button><DietProvider repository={repository}><ImportDietDialog onClose={onClose} /></DietProvider></div>)
    const dialog = screen.getByRole('dialog', { name: 'Importar desde PDF' })
    expect(screen.getByRole('heading', { name: 'Importar desde PDF' })).toHaveFocus()
    expect(container).toHaveAttribute('inert')
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Analizar PDF' })).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Cancelar importación' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    expect(dialog).toBeInTheDocument()
    unmount()
    expect(container).not.toHaveAttribute('inert')
  })

  it('aborts PDF extraction when cancelled before it settles', async () => {
    let finish!: (value: { number: number; text: string }[]) => void
    vi.mocked(extractTextPages).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    const onClose = mount()
    await selectAndAccept()
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    const signal = vi.mocked(extractTextPages).mock.calls[0][1]
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar importación' }))
    expect(signal?.aborted).toBe(true)
    finish([{ number: 1, text: 'menú' }])
    await waitFor(() => expect(fetch).not.toHaveBeenCalled())
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows a controlled error and preserves the plan when the API fails', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: 'secret' }, { status: 502 }))
    mount()
    await selectAndAccept()
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo analizar/i)
    expect(screen.queryByText('secret')).not.toBeInTheDocument()
    expect(repository.load()).toEqual(currentPlan)
  })

  it('explains when the API rejects the document size', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ error: 'hidden' }, { status: 413 }))
    mount()
    await selectAndAccept()
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/límite/i)
    expect(repository.load()).toEqual(currentPlan)
  })

  it('explains invalid structured responses without exposing server contents', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ arbitrary: 'private response' }))
    mount()
    await selectAndAccept()
    await userEvent.click(screen.getByRole('button', { name: 'Analizar PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/respuesta.*no es válida/i)
    expect(screen.queryByText('private response')).not.toBeInTheDocument()
    expect(repository.load()).toEqual(currentPlan)
  })

  it('rejects files over 10 MB without reading them', async () => {
    mount()
    const large = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.pdf', { type: 'application/pdf' })
    await userEvent.upload(screen.getByLabelText('PDF para importar'), large)
    expect(screen.getByRole('alert')).toHaveTextContent(/10 MB/)
    expect(extractTextPages).not.toHaveBeenCalled()
  })
})
