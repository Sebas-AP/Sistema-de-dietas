export type MealSlot = 'breakfast' | 'lunch' | 'morningSnack' | 'mainMeal' | 'afternoonSnack' | 'dinner'

export type GroceryCategory = 'produce' | 'protein' | 'dairy' | 'pantry' | 'other'

export type PreparationAction = 'wash' | 'cut' | 'cook' | 'prep'

export type Ingredient = {
  id: string
  name: string
  quantity?: number
  unit?: string
  category: GroceryCategory
  preparationAction?: PreparationAction
}

export type Meal = {
  id: string
  slot: MealSlot
  time?: string
  title: string
  notes?: string
  ingredients: Ingredient[]
}

export type DayPlan = {
  date: string
  meals: Meal[]
}

export type DietPlan = {
  id: string
  name: string
  startsOn: string
  waterGoalLiters?: number
  attachment?: { name: string; size: number }
  days: DayPlan[]
}

export type ShoppingItem = {
  key: string
  name: string
  category: GroceryCategory
  quantity?: number
  unit?: string
}

export type PreparationItem = {
  key: string
  name: string
  action: PreparationAction
  date: string
}
