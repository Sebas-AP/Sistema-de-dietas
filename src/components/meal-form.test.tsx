import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MealForm } from './meal-form'

describe('MealForm', () => {
  it('adds a meal with its ingredient through labelled fields', async () => {
    const onSave = vi.fn()
    render(<MealForm day="2026-10-12" onSave={onSave} />)
    await userEvent.selectOptions(screen.getByLabelText('Momento'), 'mainMeal')
    await userEvent.type(screen.getByLabelText('Nombre de la comida'), 'Pollo con verduras')
    await userEvent.type(screen.getByLabelText('Alimento'), 'Pollo')
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'protein')
    await userEvent.selectOptions(screen.getByLabelText('Preparación'), 'cook')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Pollo con verduras', slot: 'mainMeal',
      ingredients: [expect.objectContaining({ name: 'Pollo', category: 'protein', preparationAction: 'cook' })],
    }))
  })

  it('shows ingredient validation beside invalid fields', async () => {
    render(<MealForm day="2026-10-12" onSave={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
    expect(await screen.findByText('Ingresa un alimento')).toBeVisible()
  })

  it('requires a positive quantity when a unit is entered', async () => {
    const onSave = vi.fn()
    render(<MealForm day="2026-10-12" onSave={onSave} />)
    await userEvent.type(screen.getByLabelText('Nombre de la comida'), 'Arroz')
    await userEvent.type(screen.getByLabelText('Alimento'), 'Arroz')
    await userEvent.type(screen.getByLabelText('Unidad'), 'taza')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
    expect(screen.getByText('Ingresa una cantidad mayor a cero')).toBeVisible()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('clears ingredient errors when an earlier row is removed', async () => {
    render(<MealForm day="2026-10-12" onSave={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Nombre de la comida'), 'Ensalada')
    await userEvent.click(screen.getByRole('button', { name: 'Agregar alimento' }))
    await userEvent.type(screen.getByLabelText('Alimento 2'), 'Tomate')
    await userEvent.selectOptions(screen.getByLabelText('Categoría 2'), 'produce')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
    expect(screen.getByText('Ingresa un alimento')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar alimento 1' }))
    expect(screen.queryByText('Ingresa un alimento')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Alimento')).toHaveValue('Tomate')
  })
})
