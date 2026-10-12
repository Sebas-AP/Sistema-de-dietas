import type { DietPlan } from '../domain/types'

export const PLAN_STORAGE_KEY = 'dietas:plan'
const COMPLETION_STORAGE_PREFIX = 'dietas:completion:'

export const EMPTY_PLAN: DietPlan = {
  id: 'local-plan',
  name: 'Mi plan semanal',
  startsOn: '',
  days: [],
}

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>
type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isIngredient(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && ['produce', 'protein', 'dairy', 'pantry', 'other'].includes(value.category as string)
    && (value.quantity === undefined || (typeof value.quantity === 'number' && Number.isFinite(value.quantity)))
    && isOptionalString(value.unit)
    && (value.preparationAction === undefined || ['wash', 'cut', 'cook', 'prep'].includes(value.preparationAction as string))
}

function isMeal(value: unknown): boolean {
  return isRecord(value)
    && typeof value.id === 'string'
    && ['breakfast', 'lunch', 'morningSnack', 'mainMeal', 'afternoonSnack', 'dinner'].includes(value.slot as string)
    && typeof value.title === 'string'
    && isOptionalString(value.time)
    && isOptionalString(value.notes)
    && Array.isArray(value.ingredients)
    && value.ingredients.every(isIngredient)
}

function isDietPlan(value: unknown): value is DietPlan {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.startsOn === 'string'
    && (value.waterGoalLiters === undefined || (typeof value.waterGoalLiters === 'number' && Number.isFinite(value.waterGoalLiters)))
    && (value.attachment === undefined || (isRecord(value.attachment)
      && typeof value.attachment.name === 'string'
      && value.attachment.name.trim().length > 0
      && typeof value.attachment.size === 'number'
      && Number.isFinite(value.attachment.size)
      && value.attachment.size >= 0
      && value.attachment.size <= 10 * 1024 * 1024))
    && Array.isArray(value.days)
    && value.days.every((day) => isRecord(day)
      && typeof day.date === 'string'
      && Array.isArray(day.meals)
      && day.meals.every(isMeal))
}

export class LocalPlanRepository {
  constructor(private readonly storage?: StorageAccess) {}

  private getStorage(): StorageAccess | undefined {
    try {
      return this.storage ?? globalThis.localStorage
    } catch {
      return undefined
    }
  }

  load(): DietPlan {
    try {
      const saved = this.getStorage()?.getItem(PLAN_STORAGE_KEY)
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        if (isDietPlan(parsed)) return parsed
      }
    } catch {
      // Browser storage may be disabled or contain malformed JSON.
    }
    return { ...EMPTY_PLAN, days: [] }
  }

  save(plan: DietPlan): void {
    if (!isDietPlan(plan)) throw new TypeError('El plan no tiene un formato válido')
    try {
      this.getStorage()?.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan))
    } catch {
      // Keep the in-memory plan usable if browser storage is unavailable.
    }
  }

  loadCompletion(key: string): boolean {
    try {
      return this.getStorage()?.getItem(`${COMPLETION_STORAGE_PREFIX}${encodeURIComponent(key)}`) === 'true'
    } catch {
      return false
    }
  }

  saveCompletion(key: string, complete: boolean): void {
    try {
      this.getStorage()?.setItem(`${COMPLETION_STORAGE_PREFIX}${encodeURIComponent(key)}`, complete ? 'true' : 'false')
    } catch {
      // Completion remains usable in the current session.
    }
  }
}
