import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DietPlan } from '../domain/types'
import { DietProvider } from '../state/diet-store'
import { LocalPlanRepository } from '../storage/local-plan-repository'
import { DerivedList } from './derived-list'

const repository = new LocalPlanRepository()
const plan: DietPlan = {
  id: 'plan', name: 'Semana', startsOn: '2026-10-12', days: [
    { date: '2026-10-12', meals: [{ id: 'meal-1', slot: 'mainMeal', title: 'Pollo asado', ingredients: [
      { id: 'chicken', name: 'Pollo', category: 'protein', quantity: 2, unit: 'pieza', preparationAction: 'cook' },
      { id: 'carrot', name: 'Zanahoria', category: 'produce', quantity: 1, unit: 'pieza', preparationAction: 'wash' },
    ] }] },
  ],
}

describe('DerivedList', () => {
  beforeEach(() => {
    localStorage.clear()
    repository.save(plan)
  })

  it('groups shopping items and persists completion without changing the meal', async () => {
    render(<DietProvider repository={repository}><DerivedList kind="shopping" plan={plan} /></DietProvider>)
    const protein = screen.getByRole('group', { name: 'Proteínas' })
    const checkbox = within(protein).getByRole('checkbox', { name: /Pollo/i })
    expect(screen.getByRole('group', { name: 'Frutas y verduras' })).toBeVisible()
    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(repository.loadCompletion('["protein","pollo","pieza"]')).toBe(true)
    expect(repository.load().days[0].meals[0].title).toBe('Pollo asado')
  })

  it('groups preparation tasks by action and tracks them by their raw derivation key', async () => {
    render(<DietProvider repository={repository}><DerivedList kind="preparation" plan={plan} /></DietProvider>)
    const cook = screen.getByRole('group', { name: 'Cocer' })
    const checkbox = within(cook).getByRole('checkbox', { name: /Pollo/i })
    expect(screen.getByRole('group', { name: 'Lavar' })).toBeVisible()
    await userEvent.click(checkbox)
    expect(checkbox).toBeChecked()
    expect(repository.loadCompletion('2026-10-12:meal-1:chicken:cook')).toBe(true)
  })

  it('restores a saved completion when the provider hydrates', async () => {
    repository.saveCompletion('["protein","pollo","pieza"]', true)
    render(<DietProvider repository={repository}><DerivedList kind="shopping" plan={plan} /></DietProvider>)
    await waitFor(() => expect(screen.getByRole('checkbox', { name: /Pollo/i })).toBeChecked())
  })

  it('explains an empty derived list', () => {
    render(<DietProvider repository={repository}><DerivedList kind="preparation" plan={{ ...plan, days: [] }} /></DietProvider>)
    expect(screen.getByText(/No hay tareas de preparación/i)).toBeVisible()
  })
})
