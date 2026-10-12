import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DietPlan } from '../domain/types'
import { LocalPlanRepository } from '../storage/local-plan-repository'
import { DietProvider, useDietStore } from './diet-store'

const repository = new LocalPlanRepository()

function PlanNameEditor() {
  const { plan, replacePlan } = useDietStore()

  return (
    <label>
      Nombre del plan
      <input
        value={plan.name}
        onChange={(event) => replacePlan({ ...plan, name: event.target.value })}
      />
    </label>
  )
}

function CompletionControl({ itemKey }: { itemKey: string }) {
  const { completion, toggleCompletion } = useDietStore()

  return (
    <label>
      Pollo comprado
      <input
        type="checkbox"
        checked={completion[itemKey] ?? false}
        onChange={() => toggleCompletion(itemKey)}
      />
    </label>
  )
}

function HydrationReadout() {
  const { isHydrated, plan } = useDietStore()
  return <output>{isHydrated ? plan.name : 'Cargando tu plan'}</output>
}

function RemoveRestoreControls({ fullPlan, itemKey }: { fullPlan: DietPlan; itemKey: string }) {
  const { plan, replacePlan, completion } = useDietStore()
  return (
    <>
      <output>{completion[itemKey] ? 'Comprado' : 'Pendiente'}</output>
      <button type="button" onClick={() => replacePlan({ ...plan, days: [] })}>Quitar alimento</button>
      <button type="button" onClick={() => replacePlan(fullPlan)}>Recuperar alimento</button>
    </>
  )
}

describe('DietProvider', () => {
  beforeEach(() => localStorage.clear())

  it('hydrates the stored plan and persists an edited name', async () => {
    repository.save({ id: 'local-plan', name: 'Plan guardado', startsOn: '', days: [] })
    render(<DietProvider repository={repository}><PlanNameEditor /></DietProvider>)

    const input = await screen.findByRole('textbox', { name: 'Nombre del plan' })
    await waitFor(() => expect(input).toHaveValue('Plan guardado'))
    await userEvent.clear(input)
    await userEvent.type(input, 'Menú familiar')

    await waitFor(() => expect(repository.load().name).toBe('Menú familiar'))
  })

  it('shows neutral content until the saved plan has loaded', async () => {
    repository.save({ id: 'local-plan', name: 'Plan guardado', startsOn: '', days: [] })
    const firstPaint = renderToStaticMarkup(
      <DietProvider repository={repository}><HydrationReadout /></DietProvider>,
    )
    expect(firstPaint).toContain('Cargando tu plan')
    expect(firstPaint).not.toContain('Mi plan semanal')

    render(<DietProvider repository={repository}><HydrationReadout /></DietProvider>)
    expect(await screen.findByText('Plan guardado')).toBeVisible()
  })

  it('hydrates and persists completion without changing the plan', async () => {
    const itemKey = '["protein","pollo","pieza"]'
    repository.save({
      id: 'local-plan', name: 'Plan guardado', startsOn: '2026-10-12',
      days: [{ date: '2026-10-12', meals: [{
        id: 'comida-1', slot: 'mainMeal', title: 'Pollo',
        ingredients: [{ id: 'pollo-1', name: 'Pollo', quantity: 1, unit: 'pieza', category: 'protein' }],
      }] }],
    })
    repository.saveCompletion(itemKey, true)
    render(<DietProvider repository={repository}><CompletionControl itemKey={itemKey} /></DietProvider>)

    const checkbox = screen.getByRole('checkbox', { name: 'Pollo comprado' })
    await waitFor(() => expect(checkbox).toBeChecked())
    await userEvent.click(checkbox)

    expect(checkbox).not.toBeChecked()
    expect(repository.loadCompletion(itemKey)).toBe(false)
    expect(repository.load().name).toBe('Plan guardado')
  })

  it('clears a removed item so reintroducing its key starts unchecked', async () => {
    const itemKey = '["protein","pollo","pieza"]'
    const fullPlan: DietPlan = {
      id: 'local-plan', name: 'Plan guardado', startsOn: '2026-10-12',
      days: [{ date: '2026-10-12', meals: [{
        id: 'comida-1', slot: 'mainMeal', title: 'Pollo',
        ingredients: [{ id: 'pollo-1', name: 'Pollo', quantity: 1, unit: 'pieza', category: 'protein' }],
      }] }],
    }
    repository.save(fullPlan)
    repository.saveCompletion(itemKey, true)
    render(
      <DietProvider repository={repository}>
        <RemoveRestoreControls fullPlan={fullPlan} itemKey={itemKey} />
      </DietProvider>,
    )

    await screen.findByText('Comprado')
    await userEvent.click(screen.getByRole('button', { name: 'Quitar alimento' }))
    expect(screen.getByText('Pendiente')).toBeVisible()
    expect(repository.loadCompletion(itemKey)).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Recuperar alimento' }))
    expect(screen.getByText('Pendiente')).toBeVisible()
  })
})
