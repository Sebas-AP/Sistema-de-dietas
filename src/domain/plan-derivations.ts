import type { DietPlan, PreparationItem, ShoppingItem } from './types'

export function buildShoppingList(plan: DietPlan): ShoppingItem[] {
  const items = new Map<string, ShoppingItem>()

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        const name = ingredient.name.trim()
        const unit = ingredient.unit?.trim() || undefined
        const key = JSON.stringify([ingredient.category, name.toLocaleLowerCase('es-MX'), unit ?? ''])
        const existing = items.get(key)

        if (existing) {
          if (Number.isFinite(existing.quantity) && Number.isFinite(ingredient.quantity)) {
            existing.quantity = existing.quantity! + ingredient.quantity!
          } else {
            delete existing.quantity
          }
          continue
        }

        const item: ShoppingItem = { key, name, category: ingredient.category }
        if (unit) item.unit = unit
        if (Number.isFinite(ingredient.quantity)) item.quantity = ingredient.quantity
        items.set(key, item)
      }
    }
  }

  return [...items.values()].sort((a, b) =>
    a.category.localeCompare(b.category, 'es-MX') || a.name.localeCompare(b.name, 'es-MX'),
  )
}

export function buildPreparationList(plan: DietPlan): PreparationItem[] {
  const items: PreparationItem[] = []

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const ingredient of meal.ingredients) {
        if (!ingredient.preparationAction) continue
        items.push({
          key: `${day.date}:${meal.id}:${ingredient.id}:${ingredient.preparationAction}`,
          name: ingredient.name.trim(),
          action: ingredient.preparationAction,
          date: day.date,
        })
      }
    }
  }

  return items
}
