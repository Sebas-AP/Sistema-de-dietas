import { describe, expect, it } from 'vitest'
import { validateMeal } from './meal-validation'
import type { Meal } from './types'

function mealWithIngredient(name: string, quantity?: number, unit?: string): Meal {
  return {
    id: 'meal-1',
    slot: 'mainMeal',
    title: 'Comida',
    ingredients: [{ id: 'ingredient-1', name, category: 'produce', quantity, unit }],
  }
}

describe('validateMeal', () => {
  it('rejects a blank ingredient name and non-positive quantity with a unit', () => {
    expect(validateMeal(mealWithIngredient('  ', 0, 'taza'))).toEqual({
      'ingredients.0.name': 'Ingresa un alimento',
      'ingredients.0.quantity': 'Ingresa una cantidad mayor a cero',
    })
  })

  it('rejects a negative quantity and accepts a positive one', () => {
    expect(validateMeal(mealWithIngredient('Arroz', -1, 'taza'))).toHaveProperty(
      'ingredients.0.quantity',
      'Ingresa una cantidad mayor a cero',
    )
    expect(validateMeal(mealWithIngredient('Arroz', 2, 'taza'))).toEqual({})
  })

  it('allows an ingredient without quantity and unit', () => {
    expect(validateMeal(mealWithIngredient('Limón'))).toEqual({})
  })
})
