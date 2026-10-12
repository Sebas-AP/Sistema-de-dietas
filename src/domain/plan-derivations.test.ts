import { describe, expect, it } from 'vitest'
import { buildPreparationList, buildShoppingList } from './plan-derivations'
import type { DietPlan, Ingredient } from './types'

function planWithIngredients(...ingredients: Ingredient[]): DietPlan {
  return {
    id: 'local-plan',
    name: 'Mi plan semanal',
    startsOn: '2026-10-12',
    days: [{
      date: '2026-10-12',
      meals: [{ id: 'meal-1', slot: 'mainMeal', title: 'Comida', ingredients }],
    }],
  }
}

function ingredient(name: string, quantity: number, unit: string, category: Ingredient['category'], id: string): Ingredient {
  return { id, name, quantity, unit, category }
}

describe('plan derivations', () => {
  it('aggregates compatible ingredient quantities ignoring case and whitespace', () => {
    const plan = planWithIngredients(
      ingredient(' Pollo ', 1, 'pieza', 'protein', 'ingredient-1'),
      ingredient('pollo', 2, 'pieza', 'protein', 'ingredient-2'),
    )

    expect(buildShoppingList(plan)).toEqual([{
      key: '["protein","pollo","pieza"]',
      name: 'Pollo',
      category: 'protein',
      quantity: 3,
      unit: 'pieza',
    }])
  })

  it('keeps incompatible units on separate shopping rows', () => {
    const plan = planWithIngredients(
      ingredient('Arroz', 1, 'kg', 'pantry', 'ingredient-1'),
      ingredient('arroz', 500, 'g', 'pantry', 'ingredient-2'),
    )

    expect(buildShoppingList(plan)).toHaveLength(2)
  })

  it('does not combine different name and unit pairs containing delimiters', () => {
    const plan = planWithIngredients(
      ingredient('A:B', 1, 'C', 'protein', 'ingredient-1'),
      ingredient('A', 2, 'b:C', 'protein', 'ingredient-2'),
    )

    const list = buildShoppingList(plan)
    expect(list).toHaveLength(2)
    expect(list).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'A:B', unit: 'C', quantity: 1 }),
      expect.objectContaining({ name: 'A', unit: 'b:C', quantity: 2 }),
    ]))
    expect(new Set(list.map((item) => item.key)).size).toBe(2)
  })

  it('keeps the same name and unit in different categories separate', () => {
    const plan = planWithIngredients(
      ingredient('Leche', 1, 'litro', 'dairy', 'ingredient-1'),
      ingredient('leche', 2, 'litro', 'pantry', 'ingredient-2'),
    )

    const list = buildShoppingList(plan)
    expect(list).toHaveLength(2)
    expect(list.map((item) => item.category)).toEqual(['dairy', 'pantry'])
    expect(list.map((item) => item.quantity)).toEqual([1, 2])
  })

  it('keeps an ingredient visible without inventing a quantity', () => {
    const plan = planWithIngredients(
      { id: 'ingredient-1', name: '  Limón  ', category: 'produce' },
      { id: 'ingredient-2', name: 'limón', category: 'produce', quantity: 2 },
    )

    expect(buildShoppingList(plan)).toEqual([{
      key: '["produce","limón",""]',
      name: 'Limón',
      category: 'produce',
    }])
  })

  it('only emits ingredients that have a preparation action', () => {
    const withAction = planWithIngredients({ id: 'ingredient-1', name: 'Zanahoria', category: 'produce', preparationAction: 'cut' })
    const withoutAction = planWithIngredients({ id: 'ingredient-2', name: 'Manzana', category: 'produce' })

    expect(buildPreparationList(withAction)).toMatchObject([{ name: 'Zanahoria', action: 'cut', date: '2026-10-12' }])
    expect(buildPreparationList(withoutAction)).toEqual([])
  })
})
