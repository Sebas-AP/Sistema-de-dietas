'use client'

import { useId, useState } from 'react'
import type { ChangeEvent } from 'react'

export type PdfDescriptor = { name: string; size: number }

const MAX_PDF_BYTES = 10 * 1024 * 1024

export function PdfAttachment({ value, onChange }: {
  value?: PdfDescriptor
  onChange: (descriptor: PdfDescriptor | null) => void
}) {
  const id = useId()
  const [error, setError] = useState('')

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''
    if (file.type !== 'application/pdf' || !file.name.trim() || file.size > MAX_PDF_BYTES) {
      setError('Selecciona un archivo PDF de hasta 10 MB')
      return
    }
    setError('')
    onChange({ name: file.name, size: file.size })
  }

  return (
    <section className="pdf-attachment" aria-labelledby={`${id}-title`}>
      <div>
        <h3 id={`${id}-title`}>PDF de referencia</h3>
        <p>Guarda solo el nombre y tamaño del archivo. El PDF no se sube ni se conserva aquí.</p>
      </div>
      <div className="field">
        <label htmlFor={`${id}-file`}>PDF de referencia</label>
        <input id={`${id}-file`} type="file" accept="application/pdf,.pdf" onChange={chooseFile} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-hint`} />
        <span className="field__hint" id={`${id}-hint`}>Hasta 10 MB</span>
        {error && <span className="field__error" id={`${id}-error`} role="alert">{error}</span>}
      </div>
      {value && (
        <div className="pdf-attachment__selected">
          <span>Referencia: <strong>{value.name}</strong> · {(value.size / 1024).toLocaleString('es-MX', { maximumFractionDigits: 1 })} KB</span>
          <button type="button" className="text-button" onClick={() => { setError(''); onChange(null) }}>Quitar PDF</button>
        </div>
      )}
    </section>
  )
}
