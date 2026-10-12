'use client'

import { useState } from 'react'

export async function shareSummary(text: string): Promise<'shared' | 'copied'> {
  if (typeof navigator.share === 'function') {
    await navigator.share({ title: 'Mi dieta semanal', text })
    return 'shared'
  }
  await navigator.clipboard.writeText(text)
  return 'copied'
}

export function ShareButton({ text }: { text: string }) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleShare() {
    setBusy(true)
    setStatus('')
    try {
      const result = await shareSummary(text)
      setStatus(result === 'copied' ? 'Resumen copiado' : 'Resumen compartido')
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStatus('No se pudo compartir el resumen.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="share-control">
      <button className="button button--quiet" type="button" disabled={busy} onClick={handleShare}>Compartir resumen</button>
      <span role="status" aria-live="polite">{status}</span>
    </div>
  )
}
