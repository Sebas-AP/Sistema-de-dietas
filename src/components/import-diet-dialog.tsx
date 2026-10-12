'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { draftToPlan, parseImportDraft, shouldUseVision } from '../domain/import-draft'
import type { ImportDraft } from '../domain/import-draft'
import { useDietStore } from '../state/diet-store'
import { extractTextPages, renderVisionPages } from './pdf-importer'

const MAX_PDF_BYTES = 10 * 1024 * 1024
const WEEKDAY_LABELS: Record<ImportDraft['days'][number]['weekday'], string> = {
  monday: 'lunes', tuesday: 'martes', wednesday: 'miércoles', thursday: 'jueves',
  friday: 'viernes', saturday: 'sábado', sunday: 'domingo',
}

async function requestDraft(body: object, signal: AbortSignal): Promise<ImportDraft> {
  const response = await fetch('/api/import-diet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal,
  })
  if (response.status === 413) throw new Error('El PDF supera el límite de datos permitido para el análisis')
  if (response.status === 400) throw new Error('El contenido del PDF no tiene un formato válido para analizarlo')
  if (!response.ok) throw new Error('No se pudo analizar el PDF. El servicio no está disponible.')
  try {
    return parseImportDraft(await response.json())
  } catch {
    throw new Error('La respuesta del análisis no es válida. Inténtalo de nuevo.')
  }
}

export function ImportDietDialog({ onClose }: { onClose: () => void }) {
  const { replacePlan } = useDietStore()
  const titleId = useId()
  const [file, setFile] = useState<File | null>(null)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [stage, setStage] = useState<'select' | 'reading' | 'analyzing' | 'review'>('select')
  const [draft, setDraft] = useState<ImportDraft | null>(null)
  const [error, setError] = useState('')
  const controllerRef = useRef<AbortController | null>(null)
  const activeRef = useRef(true)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const backdrop = backdropRef.current
    const background = [...document.body.children].filter((child) => child !== backdrop)
      .map((child) => ({ element: child, wasInert: child.hasAttribute('inert') }))
    background.forEach(({ element }) => element.setAttribute('inert', ''))
    headingRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab' || !backdrop) return
      const controls = [...backdrop.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      if (controls.length === 0) {
        event.preventDefault()
        headingRef.current?.focus()
        return
      }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      activeRef.current = false
      controllerRef.current?.abort()
      document.removeEventListener('keydown', onKeyDown, true)
      background.forEach(({ element, wasInert }) => { if (!wasInert) element.removeAttribute('inert') })
    }
  }, [])

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    event.target.value = ''
    if (!selected) return
    setDraft(null)
    setFile(null)
    setError('')
    if (selected.type !== 'application/pdf' || !selected.name.trim() || selected.size > MAX_PDF_BYTES) {
      setError('Selecciona un archivo PDF de hasta 10 MB')
      return
    }
    setFile(selected)
  }

  async function analyze() {
    if (!file) {
      setError('Selecciona un archivo PDF de hasta 10 MB')
      return
    }
    if (!acceptedPrivacy) {
      setError('Acepta el envío de datos a NVIDIA para continuar')
      return
    }
    setError('')
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      setStage('reading')
      const pages = await extractTextPages(file, controller.signal)
      if (controller.signal.aborted) return
      setStage('analyzing')
      let result = await requestDraft({ mode: 'text', pages }, controller.signal)
      if (controller.signal.aborted) return
      if (shouldUseVision(result)) {
        setStage('reading')
        const visionPages = await renderVisionPages(file, 2, controller.signal)
        if (controller.signal.aborted) return
        setStage('analyzing')
        result = await requestDraft({ mode: 'vision', pages: visionPages }, controller.signal)
        if (shouldUseVision(result)) {
          setStage('select')
          setError('La extracción visual no fue suficiente para crear un borrador confiable. Prueba con otro PDF.')
          return
        }
      }
      if (controller.signal.aborted) return
      setDraft(result)
      setStage('review')
    } catch (cause) {
      if (activeRef.current && !controller.signal.aborted) {
        setStage('select')
        setError(cause instanceof Error && (
          cause.message.startsWith('El PDF supera el límite') ||
          cause.message.startsWith('El contenido del PDF') ||
          cause.message.startsWith('La respuesta del análisis') ||
          cause.message.startsWith('No se pudo analizar el PDF')
        ) ? cause.message : 'No se pudo analizar el PDF. Comprueba el archivo o la conexión e inténtalo de nuevo.')
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }

  function close() {
    controllerRef.current?.abort()
    setFile(null)
    setDraft(null)
    onClose()
  }

  function updateDraft(next: ImportDraft) {
    setDraft(next)
    setError('')
  }

  function importPlan() {
    if (!draft) return
    try {
      const reviewed = parseImportDraft(draft)
      if (reviewed.days.every((day) => day.meals.length === 0)) {
        setError('El borrador necesita al menos una comida')
        return
      }
      replacePlan((current) => ({ ...draftToPlan(reviewed, current), name: reviewed.planName }))
      close()
    } catch {
      setError('Revisa los campos del borrador antes de importarlo')
    }
  }

  const busy = stage === 'reading' || stage === 'analyzing'

  return createPortal(
    <div className="import-dialog__backdrop" ref={backdropRef}>
      <section className="import-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={busy}>
        <div className="import-dialog__header">
          <h2 id={titleId} ref={headingRef} tabIndex={-1}>Importar desde PDF</h2>
          <button type="button" className="text-button" onClick={close}>Cancelar importación</button>
        </div>
        {stage === 'review' && draft ? (
          <div className="import-dialog__content">
            <h3>Revisar borrador</h3>
            <p>Comprueba el menú antes de reemplazar tu plan actual. Puedes corregir el nombre, las comidas y los ingredientes.</p>
            {draft.warnings.length > 0 && <div className="import-dialog__warnings"><strong>Aspectos para revisar</strong><ul>{draft.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
            <div className="field">
              <label htmlFor={`${titleId}-name`}>Nombre del plan importado</label>
              <input id={`${titleId}-name`} maxLength={160} value={draft.planName} onChange={(event) => updateDraft({ ...draft, planName: event.target.value })} />
            </div>
            <div className="import-dialog__days">
              {draft.days.map((day, dayIndex) => (
                <section className="import-dialog__day" key={day.weekday} aria-label={WEEKDAY_LABELS[day.weekday]}>
                  <h4>{WEEKDAY_LABELS[day.weekday]}</h4>
                  {day.meals.map((meal, mealIndex) => (
                    <div className="import-dialog__meal" key={`${day.weekday}-${mealIndex}`}>
                      <div className="field">
                        <label htmlFor={`${titleId}-meal-${dayIndex}-${mealIndex}`}>Comida · {WEEKDAY_LABELS[day.weekday]} · {mealIndex + 1}</label>
                        <input id={`${titleId}-meal-${dayIndex}-${mealIndex}`} maxLength={160} value={meal.title} onChange={(event) => updateDraft({ ...draft, days: draft.days.map((item, index) => index !== dayIndex ? item : { ...item, meals: item.meals.map((entry, position) => position !== mealIndex ? entry : { ...entry, title: event.target.value }) }) })} />
                      </div>
                      {meal.ingredients.map((ingredient, ingredientIndex) => (
                        <div className="field" key={`${day.weekday}-${mealIndex}-${ingredientIndex}`}>
                          <label htmlFor={`${titleId}-ingredient-${dayIndex}-${mealIndex}-${ingredientIndex}`}>Ingrediente · {WEEKDAY_LABELS[day.weekday]} · {mealIndex + 1} · {ingredientIndex + 1}</label>
                          <input id={`${titleId}-ingredient-${dayIndex}-${mealIndex}-${ingredientIndex}`} maxLength={160} value={ingredient.name} onChange={(event) => updateDraft({ ...draft, days: draft.days.map((item, index) => index !== dayIndex ? item : { ...item, meals: item.meals.map((entry, position) => position !== mealIndex ? entry : { ...entry, ingredients: entry.ingredients.map((part, partIndex) => partIndex !== ingredientIndex ? part : { ...part, name: event.target.value }) }) }) })} />
                        </div>
                      ))}
                    </div>
                  ))}
                </section>
              ))}
            </div>
            {error && <p className="field__error" role="alert">{error}</p>}
            <div className="import-dialog__actions">
              <button type="button" className="button button--primary" onClick={importPlan}>Importar al plan</button>
            </div>
          </div>
        ) : (
          <div className="import-dialog__content">
            <p>Selecciona un menú en PDF. Tu plan actual seguirá igual mientras revisas el resultado.</p>
            <div className="field">
              <label htmlFor={`${titleId}-file`}>PDF para importar</label>
              <input id={`${titleId}-file`} type="file" accept="application/pdf,.pdf" onChange={chooseFile} disabled={busy} />
              <span className="field__hint">Hasta 10 MB. El archivo se mantiene en memoria durante la importación.</span>
            </div>
            {file && <p className="import-dialog__filename">Archivo: {file.name}</p>}
            <label className="import-dialog__consent"><input type="checkbox" checked={acceptedPrivacy} onChange={(event) => setAcceptedPrivacy(event.target.checked)} disabled={busy} /> <span>Acepto enviar a NVIDIA el texto del PDF y, si hace falta, imágenes de hasta dos páginas para extraer mi menú.</span></label>
            {busy && <p role="status">{stage === 'reading' ? 'Leyendo texto' : 'Analizando menú'}</p>}
            {error && <p className="field__error" role="alert">{error}</p>}
            <div className="import-dialog__actions">
              <button type="button" className="button button--primary" onClick={analyze} disabled={busy}>Analizar PDF</button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}
