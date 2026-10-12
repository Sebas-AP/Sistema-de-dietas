import { describe, expect, it } from 'vitest'
import type { DietPlan } from '../domain/types'
import { isCalendarDate, rebaseWeek, safeWeekStart, weekDates } from './week-dates'

const plan: DietPlan = {
  id: 'plan', name: 'Semana', startsOn: '2026-10-12', days: [
    { date: '2026-10-12', meals: [{ id: 'a', slot: 'breakfast', title: 'Avena', ingredients: [] }] },
    { date: '2026-10-13', meals: [{ id: 'b', slot: 'dinner', title: 'Sopa', ingredients: [] }] },
  ],
}

describe('week dates', () => {
  it('moves each day to the same relative date in the new week without mutation', () => {
    const next = rebaseWeek(plan, '2026-10-19', '2026-10-12')
    expect(next.startsOn).toBe('2026-10-19')
    expect(next.days.map((day) => day.date)).toEqual(['2026-10-19', '2026-10-20'])
    expect(next.days.map((day) => day.meals[0].title)).toEqual(['Avena', 'Sopa'])
    expect(plan.days.map((day) => day.date)).toEqual(['2026-10-12', '2026-10-13'])
  })

  it('remaps stale dates into the scheduled week and preserves their meals', () => {
    const withStaleDay = {
      ...plan,
      days: [...plan.days, { date: '2026-10-05', meals: [{ id: 'c', slot: 'lunch' as const, title: 'Ensalada', ingredients: [] }] }],
    }
    const next = rebaseWeek(withStaleDay, '2026-10-19', '2026-10-12')
    expect(next.days.every((day) => weekDates(next.startsOn).includes(day.date))).toBe(true)
    expect(next.days.flatMap((day) => day.meals).map((meal) => meal.title)).toEqual(['Avena', 'Ensalada', 'Sopa'])
  })

  it('rejects impossible dates and falls back to a valid Monday', () => {
    expect(isCalendarDate('2026-99-99')).toBe(false)
    expect(isCalendarDate('2026-02-30')).toBe(false)
    expect(isCalendarDate('2028-02-29')).toBe(true)
    expect(safeWeekStart('2026-99-99', '2026-10-12')).toBe('2026-10-12')
    expect(weekDates(safeWeekStart('2026-99-99', '2026-10-12'))).toHaveLength(7)
  })
})
