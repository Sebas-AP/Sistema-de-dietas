import type { DietPlan, GroceryCategory, MealSlot, PreparationAction } from './types'
import { safeWeekStart } from '../components/week-dates'

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'morningSnack', 'mainMeal', 'afternoonSnack', 'dinner']
const CATEGORIES: GroceryCategory[] = ['produce', 'protein', 'dairy', 'pantry', 'other']
const ACTIONS: PreparationAction[] = ['wash', 'cut', 'cook', 'prep']

type Weekday = (typeof WEEKDAYS)[number]
type DraftIngredient = {
  name: string
  quantity?: number
  unit?: string
  category: GroceryCategory
  preparationAction?: PreparationAction
}
type DraftMeal = { slot: MealSlot; title: string; time?: string; ingredients: DraftIngredient[] }
type DraftDay = { weekday: Weekday; meals: DraftMeal[] }

export type ImportDraft = {
  planName: string
  startsOn?: string
  days: DraftDay[]
  confidence: number
  needsVision: boolean
  warnings: string[]
}

function record(value: unknown, label: string, allowedKeys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} no tiene un formato válido`)
  }
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    throw new TypeError(`${label} contiene un campo desconocido`)
  }
  return value as Record<string, unknown>
}

function boundedString(value: unknown, label: string, max = 160): string {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > max) {
    throw new TypeError(`${label} debe tener entre 1 y ${max} caracteres`)
  }
  return value.trim()
}

function optionalString(value: unknown, label: string, max = 160): string | undefined {
  return value === undefined ? undefined : boundedString(value, label, max)
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new TypeError(`${label} no es válido`)
  }
  return value as T
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} debe ser una lista`)
  return value
}

function calendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function parseImportDraft(value: unknown): ImportDraft {
  const source = record(value, 'El borrador', ['planName', 'startsOn', 'days', 'confidence', 'needsVision', 'warnings'])
  const days = array(source.days, 'Los días')
  if (days.length > 7) throw new TypeError('Hay demasiados días')
  const parsedDays: DraftDay[] = days.map((rawDay) => {
    const day = record(rawDay, 'El día', ['weekday', 'meals'])
    const weekday = oneOf(day.weekday, WEEKDAYS, 'El día de la semana')
    const meals = array(day.meals, 'Las comidas').map((rawMeal): DraftMeal => {
      const meal = record(rawMeal, 'La comida', ['slot', 'title', 'time', 'ingredients'])
      const ingredients = array(meal.ingredients, 'Los ingredientes')
      if (ingredients.length > 30) throw new TypeError('Hay demasiados ingredientes en una comida')
      return {
        slot: oneOf(meal.slot, MEAL_SLOTS, 'El horario de comida'),
        title: boundedString(meal.title, 'El título'),
        ...(meal.time === undefined ? {} : { time: boundedString(meal.time, 'La hora', 40) }),
        ingredients: ingredients.map((rawIngredient): DraftIngredient => {
          const ingredient = record(rawIngredient, 'El ingrediente', ['name', 'quantity', 'unit', 'category', 'preparationAction'])
          if (ingredient.quantity !== undefined &&
            (typeof ingredient.quantity !== 'number' || !Number.isFinite(ingredient.quantity) || ingredient.quantity <= 0)) {
            throw new TypeError('La cantidad debe ser mayor a cero')
          }
          return {
            name: boundedString(ingredient.name, 'El nombre del ingrediente'),
            ...(ingredient.quantity === undefined ? {} : { quantity: ingredient.quantity as number }),
            ...(ingredient.unit === undefined ? {} : { unit: boundedString(ingredient.unit, 'La unidad') }),
            category: oneOf(ingredient.category, CATEGORIES, 'La categoría'),
            ...(ingredient.preparationAction === undefined ? {} : { preparationAction: oneOf(ingredient.preparationAction, ACTIONS, 'La preparación') }),
          }
        }),
      }
    })
    return { weekday, meals }
  })
  if (new Set(parsedDays.map((day) => day.weekday)).size !== parsedDays.length) {
    throw new TypeError('Hay días de la semana duplicados')
  }
  const planName = boundedString(source.planName, 'El nombre del plan')
  const startsOn = optionalString(source.startsOn, 'La fecha de inicio', 10)
  if (startsOn !== undefined && !calendarDate(startsOn)) throw new TypeError('La fecha de inicio no es válida')
  if (typeof source.confidence !== 'number' || !Number.isFinite(source.confidence) || source.confidence < 0 || source.confidence > 1) {
    throw new TypeError('La confianza debe estar entre 0 y 1')
  }
  if (typeof source.needsVision !== 'boolean') throw new TypeError('La indicación de visión no es válida')
  const warnings = array(source.warnings, 'Las advertencias').map((warning) => boundedString(warning, 'La advertencia'))
  return { planName, ...(startsOn === undefined ? {} : { startsOn }), days: parsedDays, confidence: source.confidence, needsVision: source.needsVision, warnings }
}

export function shouldUseVision(draft: ImportDraft): boolean {
  return draft.needsVision || draft.confidence < 0.8 || draft.days.filter((day) => day.meals.length > 0).length < 3
}

export function draftToPlan(draft: ImportDraft, current: DietPlan): DietPlan {
  if (!calendarDate(current.startsOn)) throw new TypeError('La semana actual no tiene fecha de inicio válida')
  const start = new Date(`${safeWeekStart(current.startsOn)}T12:00:00Z`)
  const startWeekday = (start.getUTCDay() + 6) % 7
  const days = [...draft.days]
    .map((day) => {
      const date = new Date(start)
      const offset = (WEEKDAYS.indexOf(day.weekday) - startWeekday + 7) % 7
      date.setUTCDate(start.getUTCDate() + offset)
      return {
        date: date.toISOString().slice(0, 10),
        meals: day.meals.map((meal) => ({
          id: crypto.randomUUID(),
          slot: meal.slot,
          title: meal.title,
          ...(meal.time === undefined ? {} : { time: meal.time }),
          ingredients: meal.ingredients.map((ingredient) => ({ id: crypto.randomUUID(), ...ingredient })),
        })),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
  return { ...current, days }
}
