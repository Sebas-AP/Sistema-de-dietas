import { describe, expect, it } from 'vitest'
import { formatShareSummary } from './share-summary'
import type { DietPlan } from './types'

const plan: DietPlan = {
  id: 'local-plan',
  name: 'Menú familiar',
  startsOn: '2026-10-12',
  days: [{
    date: '2026-10-12',
    meals: [{
      id: 'meal-1', slot: 'mainMeal', title: 'Comida',
      notes: 'archivo secreto.pdf',
      ingredients: [
        { id: 'i1', name: 'Pollo', quantity: 2, unit: 'pieza', category: 'protein', preparationAction: 'cook' },
        { id: 'i2', name: 'Limón', category: 'produce' },
      ],
    }],
  }],
}

describe('formatShareSummary', () => {
  it('formats a shopping summary with title, date range, and quantity-free rows', () => {
    const text = formatShareSummary(plan, 'shopping')
    expect(text).toContain('Menú familiar')
    expect(text).toContain('Lista de compras')
    expect(text).toContain('12/10/2026')
    expect(text).toContain('18/10/2026')
    expect(text).toContain('• Pollo — 2 pieza')
    expect(text).toContain('• Limón')
    expect(text).toContain('Frutas y verduras\n• Limón')
    expect(text).toContain('Proteínas\n• Pollo — 2 pieza')
    expect(text).not.toContain('• Limón — 0')
    expect(text).not.toContain('archivo')
  })

  it('formats preparation actions and dates without attachment information', () => {
    const text = formatShareSummary(plan, 'preparation')
    expect(text).toContain('Lista de preparación')
    expect(text).toContain('• Cocer Pollo — 12/10/2026')
    expect(text).not.toContain('Limón')
    expect(text).not.toContain('archivo')
  })
})
