import type { Meal } from './types'

export function validateMeal(meal: Meal): Record<string, string> {
  const errors: Record<string, string> = {}

  meal.ingredients.forEach((ingredient, index) => {
    if (!ingredient.name.trim()) {
      errors[`ingredients.${index}.name`] = 'Ingresa un alimento'
    }
    if (ingredient.unit?.trim() && (ingredient.quantity === undefined || !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0)) {
      errors[`ingredients.${index}.quantity`] = 'Ingresa una cantidad mayor a cero'
    }
  })

  return errors
}
