import { describe, expect, it } from 'vitest'
import { draftToPlan, parseImportDraft, shouldUseVision } from './import-draft'
import type { DietPlan } from './types'

const currentPlan: DietPlan = {
  id: 'existing-plan',
  name: 'Mi semana',
  startsOn: '2026-10-12',
  waterGoalLiters: 2,
  attachment: { name: 'old.pdf', size: 1024 },
  days: [{ date: '2026-10-12', meals: [] }],
}

function validDraft(overrides: Record<string, unknown> = {}) {
  return {
    planName: 'Menú del PDF',
    days: [
      { weekday: 'wednesday', meals: [{ slot: 'dinner', title: 'Cena', ingredients: [{ name: 'Arroz', quantity: 1, category: 'pantry' }] }] },
      { weekday: 'monday', meals: [{ slot: 'breakfast', title: 'Desayuno', ingredients: [] }] },
      { weekday: 'friday', meals: [{ slot: 'mainMeal', title: 'Comida', ingredients: [] }] },
    ],
    confidence: 0.9,
    needsVision: false,
    warnings: [],
    ...overrides,
  }
}

describe('parseImportDraft', () => {
  it('rejects negative ingredient quantities', () => {
    const days = [{ weekday: 'monday', meals: [{ slot: 'dinner', title: 'Cena', ingredients: [{ name: 'Arroz', quantity: -1, category: 'pantry' }] }] }]
    expect(() => parseImportDraft(validDraft({ days }))).toThrow(/cantidad/i)
    expect(currentPlan.days).toHaveLength(1)
  })

  it.each([0, -1, Number.POSITIVE_INFINITY, Number.NaN])('rejects a nonpositive or nonfinite quantity (%s)', (quantity) => {
    const days = [{ weekday: 'monday', meals: [{ slot: 'dinner', title: 'Cena', ingredients: [{ name: 'Arroz', quantity, category: 'pantry' }] }] }]
    expect(() => parseImportDraft(validDraft({ days }))).toThrow(/cantidad/i)
  })

  it('rejects unknown slots, categories, actions and weekdays', () => {
    const ingredient = { name: 'Arroz', category: 'pantry' }
    for (const [field, value] of [
      ['slot', 'supper'],
      ['category', 'frozen'],
      ['preparationAction', 'fry'],
      ['weekday', 'funday'],
    ] as const) {
      const days = [{ weekday: field === 'weekday' ? value : 'monday', meals: [{ slot: field === 'slot' ? value : 'dinner', title: 'Cena', ingredients: [{ ...ingredient, ...(field === 'category' || field === 'preparationAction' ? { [field]: value } : {}) }] }] }]
      expect(() => parseImportDraft(validDraft({ days }))).toThrow()
    }
  })

  it('rejects more than 30 ingredients or a name longer than 160 characters', () => {
    const meal = { slot: 'dinner', title: 'Cena', ingredients: Array.from({ length: 31 }, () => ({ name: 'Arroz', category: 'pantry' })) }
    expect(() => parseImportDraft(validDraft({ days: [{ weekday: 'monday', meals: [meal] }] }))).toThrow(/ingredientes/i)
    expect(() => parseImportDraft(validDraft({ planName: 'A'.repeat(161) }))).toThrow()
  })

  it('rejects confidence outside 0 to 1 and duplicate weekdays', () => {
    expect(() => parseImportDraft(validDraft({ confidence: 1.01 }))).toThrow()
    const monday = { weekday: 'monday', meals: [] }
    expect(() => parseImportDraft(validDraft({ days: [monday, monday] }))).toThrow()
  })

  it.each([
    ['root', () => ({ ...validDraft(), unexpected: 'value' })],
    ['day', () => validDraft({ days: [{ weekday: 'monday', meals: [], unexpected: 'value' }] })],
    ['meal', () => validDraft({ days: [{ weekday: 'monday', meals: [{ slot: 'dinner', title: 'Cena', ingredients: [], unexpected: 'value' }] }] })],
    ['ingredient', () => validDraft({ days: [{ weekday: 'monday', meals: [{ slot: 'dinner', title: 'Cena', ingredients: [{ name: 'Arroz', category: 'pantry', unexpected: 'value' }] }] }] })],
  ])('rejects an unknown key at the %s level', (_level, input) => {
    expect(() => parseImportDraft(input())).toThrow(/campo/i)
  })
})

describe('shouldUseVision', () => {
  it('requests vision below 0.8 confidence', () => {
    expect(shouldUseVision(parseImportDraft(validDraft({ confidence: 0.79 })))).toBe(true)
  })

  it('requests vision when fewer than three days contain a meal', () => {
    expect(shouldUseVision(parseImportDraft(validDraft({ days: [{ weekday: 'monday', meals: [] }] })))).toBe(true)
  })

  it('accepts a valid three-day draft at exactly 0.8 confidence', () => {
    expect(shouldUseVision(parseImportDraft(validDraft({ confidence: 0.8 })))).toBe(false)
  })
})

describe('draftToPlan', () => {
  it('maps weekdays from the current Monday and preserves metadata without mutation', () => {
    const next = draftToPlan(parseImportDraft(validDraft()), currentPlan)
    expect(next).not.toBe(currentPlan)
    expect(next).toMatchObject({ id: 'existing-plan', name: 'Mi semana', startsOn: '2026-10-12', waterGoalLiters: 2, attachment: { name: 'old.pdf', size: 1024 } })
    expect(next.days.map((day) => day.date)).toEqual(['2026-10-12', '2026-10-14', '2026-10-16'])
    expect(next.days[1].meals[0].id).toEqual(expect.any(String))
    expect(next.days[1].meals[0].ingredients[0].id).toEqual(expect.any(String))
    expect(currentPlan.days).toEqual([{ date: '2026-10-12', meals: [] }])
  })

  it('maps named weekdays into a seven-day range starting on Tuesday', () => {
    const tuesdayPlan = { ...currentPlan, startsOn: '2026-10-13' }
    const draft = parseImportDraft(validDraft({ days: [
      { weekday: 'monday', meals: [{ slot: 'dinner', title: 'Cena', ingredients: [] }] },
      { weekday: 'tuesday', meals: [{ slot: 'breakfast', title: 'Desayuno', ingredients: [] }] },
    ] }))

    const next = draftToPlan(draft, tuesdayPlan)

    expect(next.startsOn).toBe('2026-10-13')
    expect(next.days.map((day) => day.date)).toEqual(['2026-10-13', '2026-10-19'])
  })
})
