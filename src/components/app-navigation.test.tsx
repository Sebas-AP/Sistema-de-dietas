import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AppNavigation } from './app-navigation'
import HomePage from '../app/page'

describe('AppNavigation', () => {
  it('changes the visible section using labelled buttons', async () => {
    const onChange = vi.fn()
    render(<AppNavigation active="today" onChange={onChange} />)

    expect(screen.getByRole('navigation', { name: 'Secciones principales' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Compras' }))

    expect(onChange).toHaveBeenCalledWith('shopping')
  })

  it('changes the section shown in the application shell', async () => {
    render(<HomePage />)

    expect(screen.getByRole('heading', { level: 1, name: 'Mi dieta semanal' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Ir al contenido' })).toHaveAttribute('href', '#contenido')
    await userEvent.click(screen.getByRole('button', { name: 'Compras' }))

    expect(screen.getByRole('main').querySelector('h2')).toHaveTextContent('Compras')
  })

  it('announces the selected section and moves keyboard focus into its content', async () => {
    const user = userEvent.setup()
    render(<HomePage />)

    screen.getByRole('button', { name: 'Hoy' }).focus()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Compras' })).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(screen.getByRole('button', { name: 'Compras' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('main', { name: 'Compras' })).toHaveFocus()
  })

  it('does not describe a saved plan as empty before hydration', () => {
    const firstPaint = renderToStaticMarkup(<HomePage />)
    expect(firstPaint).toContain('Cargando tu plan')
    expect(firstPaint).not.toContain('Todavía no hay comidas en el plan')
  })
})
