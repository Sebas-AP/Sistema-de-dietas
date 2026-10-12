import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DietPlan } from '../domain/types'
import { DietProvider } from '../state/diet-store'
import { LocalPlanRepository } from '../storage/local-plan-repository'
import { weekDates } from './week-dates'
import { WeeklyPlan } from './weekly-plan'

const repository = new LocalPlanRepository()
const basePlan: DietPlan = {
  id: 'local-plan', name: 'Mi semana', startsOn: '2026-10-12',
  days: [
    { date: '2026-10-12', meals: [{ id: 'a', slot: 'breakfast', title: 'Avena', ingredients: [{ id: 'i', name: 'Avena', category: 'pantry' }] }] },
    { date: '2026-10-13', meals: [{ id: 'b', slot: 'dinner', title: 'Sopa', ingredients: [{ id: 'j', name: 'Zanahoria', category: 'produce' }] }] },
  ],
}

describe('WeeklyPlan', () => {
  beforeEach(() => {
    localStorage.clear()
    repository.save(basePlan)
  })

  it('renders seven days and saves a meal without altering another day', async () => {
    render(<DietProvider repository={repository}><WeeklyPlan /></DietProvider>)
    expect(await screen.findByRole('heading', { name: /lunes 12 de octubre/i })).toBeVisible()
    expect(screen.getAllByRole('region', { name: /(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i })).toHaveLength(7)
    await userEvent.click(screen.getByRole('button', { name: /agregar comida.*lunes 12/i }))
    await userEvent.type(screen.getByLabelText('Nombre de la comida'), 'Huevos')
    await userEvent.type(screen.getByLabelText('Alimento'), 'Huevo')
    await userEvent.selectOptions(screen.getByLabelText('Categoría'), 'protein')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
    expect(screen.getByText('Huevos')).toBeVisible()
    expect(repository.load().days.find((day) => day.date === '2026-10-13')?.meals[0].title).toBe('Sopa')
    expect(repository.load().days.find((day) => day.date === '2026-10-12')?.meals).toHaveLength(2)
  })

  it('edits only the selected meal and persists a PDF descriptor', async () => {
    render(<DietProvider repository={repository}><WeeklyPlan /></DietProvider>)
    const monday = await screen.findByRole('region', { name: /lunes 12 de octubre/i })
    await userEvent.click(within(monday).getByRole('button', { name: 'Editar Avena' }))
    await userEvent.clear(screen.getByLabelText('Nombre de la comida'))
    await userEvent.type(screen.getByLabelText('Nombre de la comida'), 'Avena con fruta')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
    expect(repository.load().days[0].meals[0].title).toBe('Avena con fruta')
    await userEvent.upload(screen.getByLabelText('PDF de referencia', { selector: 'input[type="file"]' }), new File(['%PDF'], 'plan.pdf', { type: 'application/pdf' }))
    expect(repository.load().attachment).toEqual({ name: 'plan.pdf', size: 4 })
  })

  it('rebases persisted meals when the week start changes', async () => {
    render(<DietProvider repository={repository}><WeeklyPlan /></DietProvider>)
    const start = await screen.findByLabelText('Inicio de la semana')
    fireEvent.change(start, { target: { value: '2026-10-19' } })
    expect(repository.load().days.map((day) => day.date)).toEqual(['2026-10-19', '2026-10-20'])
    const monday = screen.getByRole('region', { name: /lunes 19 de octubre/i })
    expect(within(monday).getByText((content, element) => element?.tagName === 'STRONG' && content === 'Avena')).toBeVisible()
    expect(screen.getByText('Sopa')).toBeVisible()
  })

  it('renders a valid fallback week for an impossible saved date', async () => {
    repository.save({ ...basePlan, startsOn: '2026-99-99' })
    render(<DietProvider repository={repository}><WeeklyPlan /></DietProvider>)
    expect(await screen.findByRole('heading', { name: 'Semana' })).toBeVisible()
    expect(screen.getAllByRole('region', { name: /(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i })).toHaveLength(7)
    await waitFor(() => expect(repository.load().startsOn).toMatch(/^\d{4}-\d{2}-\d{2}$/))
    const repaired = repository.load()
    expect(repaired.days.every((day) => weekDates(repaired.startsOn).includes(day.date))).toBe(true)
  })

  it('restores focus after save, cancel, and deletion', async () => {
    render(<DietProvider repository={repository}><WeeklyPlan /></DietProvider>)
    const monday = await screen.findByRole('region', { name: /lunes 12 de octubre/i })
    const add = within(monday).getByRole('button', { name: /agregar comida/i })
    await userEvent.click(add)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(add).toHaveFocus())
    const edit = within(monday).getByRole('button', { name: 'Editar Avena' })
    await userEvent.click(edit)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar comida' }))
    await waitFor(() => expect(edit).toHaveFocus())
    await userEvent.click(within(monday).getByRole('button', { name: 'Eliminar Avena' }))
    await waitFor(() => expect(within(monday).getByRole('heading', { name: /lunes 12 de octubre/i })).toHaveFocus())
  })
})
