import { describe, expect, it } from 'vitest'
import { EMPTY_PLAN, LocalPlanRepository, PLAN_STORAGE_KEY } from './local-plan-repository'
import type { DietPlan } from '../domain/types'

class MemoryStorage {
  private values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

const plan: DietPlan = {
  id: 'plan-1', name: 'Mi semana', startsOn: '2026-10-12',
  days: [{ date: '2026-10-12', meals: [{
    id: 'meal-1', slot: 'mainMeal', title: 'Comida',
    ingredients: [{ id: 'ingredient-1', name: 'Pollo', category: 'protein' }],
  }] }],
}

describe('LocalPlanRepository', () => {
  it('falls back to an empty plan when saved JSON is corrupt', () => {
    const storage = new MemoryStorage()
    storage.setItem(PLAN_STORAGE_KEY, '{bad json')
    expect(new LocalPlanRepository(storage).load()).toEqual(EMPTY_PLAN)
  })

  it('falls back when saved JSON is structurally invalid', () => {
    const storage = new MemoryStorage()
    storage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ ...plan, days: [{ date: '2026-10-12', meals: null }] }))
    expect(new LocalPlanRepository(storage).load()).toEqual(EMPTY_PLAN)
  })

  it('round-trips a valid plan without dropping meals', () => {
    const repository = new LocalPlanRepository(new MemoryStorage())
    repository.save(plan)
    expect(repository.load()).toEqual(plan)
  })

  it('round-trips only a valid PDF descriptor', () => {
    const repository = new LocalPlanRepository(new MemoryStorage())
    const withPdf = { ...plan, attachment: { name: 'menu.pdf', size: 1024 } }
    repository.save(withPdf)
    expect(repository.load().attachment).toEqual({ name: 'menu.pdf', size: 1024 })
    expect(() => repository.save({ ...plan, attachment: { name: 'menu.pdf', size: -1 } })).toThrow(TypeError)
    expect(repository.load()).toEqual(withPdf)
  })

  it('rejects an invalid plan without replacing valid saved data', () => {
    const repository = new LocalPlanRepository(new MemoryStorage())
    repository.save(plan)
    expect(() => repository.save({ ...plan, days: null } as unknown as DietPlan)).toThrow(TypeError)
    expect(repository.load()).toEqual(plan)
  })

  it('persists completion independently for each key', () => {
    const repository = new LocalPlanRepository(new MemoryStorage())
    repository.saveCompletion('shopping:pollo', true)
    repository.saveCompletion('shopping:limon', false)
    expect(repository.loadCompletion('shopping:pollo')).toBe(true)
    expect(repository.loadCompletion('shopping:limon')).toBe(false)
    expect(repository.loadCompletion('missing')).toBe(false)
  })

  it('falls back when storage access throws', () => {
    const unavailable = {
      getItem(): string { throw new Error('Storage disabled') },
      setItem(): void { throw new Error('Storage disabled') },
    }
    const repository = new LocalPlanRepository(unavailable)
    expect(repository.load()).toEqual(EMPTY_PLAN)
    expect(repository.loadCompletion('shopping:pollo')).toBe(false)
    expect(() => repository.save(plan)).not.toThrow()
    expect(() => repository.saveCompletion('shopping:pollo', true)).not.toThrow()
  })
})
