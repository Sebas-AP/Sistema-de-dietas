import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareButton } from './share-button'

describe('ShareButton', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses clipboard and announces completion when device sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<ShareButton text="Lista de compras" />)
    await userEvent.click(screen.getByRole('button', { name: 'Compartir resumen' }))
    expect(writeText).toHaveBeenCalledWith('Lista de compras')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Resumen copiado'))
  })

  it('uses the native share sheet with title and text when supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    render(<ShareButton text="Lista de preparación" />)
    await userEvent.click(screen.getByRole('button', { name: 'Compartir resumen' }))
    expect(share).toHaveBeenCalledWith({ title: 'Mi dieta semanal', text: 'Lista de preparación' })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('treats a cancelled native share as a safe no-op', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError'))
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    render(<ShareButton text="Lista de compras" />)
    const button = screen.getByRole('button', { name: 'Compartir resumen' })
    await userEvent.click(button)
    expect(share).toHaveBeenCalledOnce()
    expect(writeText).not.toHaveBeenCalled()
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('announces an unexpected native-share rejection without copying instead', async () => {
    const share = vi.fn().mockRejectedValue(new Error('Share unavailable'))
    const writeText = vi.fn()
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    render(<ShareButton text="Lista de preparación" />)
    const button = screen.getByRole('button', { name: 'Compartir resumen' })
    await userEvent.click(button)
    expect(share).toHaveBeenCalledOnce()
    expect(writeText).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No se pudo compartir el resumen.'))
    expect(button).toBeEnabled()
  })

  it('announces a clipboard failure and restores the share button', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Clipboard unavailable'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<ShareButton text="Lista de compras" />)
    const button = screen.getByRole('button', { name: 'Compartir resumen' })
    await userEvent.click(button)
    expect(writeText).toHaveBeenCalledWith('Lista de compras')
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No se pudo compartir el resumen.'))
    expect(button).toBeEnabled()
  })
})
