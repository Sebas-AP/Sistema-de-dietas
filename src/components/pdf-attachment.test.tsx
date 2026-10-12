import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PdfAttachment } from './pdf-attachment'

describe('PdfAttachment', () => {
  it('rejects a non-PDF and accepts a PDF below 10 MB', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup({ applyAccept: false })
    render(<PdfAttachment onChange={onChange} />)
    const fileInput = screen.getByLabelText('PDF de referencia', { selector: 'input[type="file"]' })
    await user.upload(fileInput, new File(['x'], 'menu.png', { type: 'image/png' }))
    expect(screen.getByText('Selecciona un archivo PDF de hasta 10 MB')).toBeVisible()
    expect(onChange).not.toHaveBeenCalled()
    await user.upload(fileInput, new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' }))
    expect(onChange).toHaveBeenCalledWith({ name: 'menu.pdf', size: 4 })
  })

  it('rejects oversized PDFs and removes the selected descriptor', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<PdfAttachment onChange={onChange} />)
    const tooLarge = new File(['x'], 'grande.pdf', { type: 'application/pdf' })
    Object.defineProperty(tooLarge, 'size', { value: 10 * 1024 * 1024 + 1 })
    await userEvent.upload(screen.getByLabelText('PDF de referencia', { selector: 'input[type="file"]' }), tooLarge)
    expect(screen.getByText('Selecciona un archivo PDF de hasta 10 MB')).toBeVisible()
    expect(onChange).not.toHaveBeenCalled()
    rerender(<PdfAttachment value={{ name: 'menu.pdf', size: 4 }} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Quitar PDF' }))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
