import type { DietPlan, DayPlan } from '../domain/types'

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function localMonday(): string {
  const date = new Date()
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

export function safeWeekStart(saved: string, fallback = localMonday()): string {
  return isCalendarDate(saved) ? saved : isCalendarDate(fallback) ? fallback : localMonday()
}

function dateAt(start: string, offset: number): string {
  const date = new Date(`${start}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + offset)
  return date.toISOString().slice(0, 10)
}

export function weekDates(start: string): string[] {
  const validStart = safeWeekStart(start)
  return Array.from({ length: 7 }, (_, index) => dateAt(validStart, index))
}

export function rebaseWeek(plan: DietPlan, newStart: string, fallbackStart = localMonday()): DietPlan {
  if (!isCalendarDate(newStart)) return plan
  const oldStart = safeWeekStart(plan.startsOn, fallbackStart)
  const oldTime = new Date(`${oldStart}T12:00:00Z`).getTime()
  const nextDays = new Map<string, DayPlan>()

  for (const day of plan.days) {
    const offset = isCalendarDate(day.date)
      ? Math.round((new Date(`${day.date}T12:00:00Z`).getTime() - oldTime) / 86_400_000)
      : 0
    const index = ((offset % 7) + 7) % 7
    const date = dateAt(newStart, index)
    const existing = nextDays.get(date)
    nextDays.set(date, { date, meals: [...(existing?.meals ?? []), ...day.meals] })
  }

  return {
    ...plan,
    startsOn: newStart,
    days: [...nextDays.values()].sort((a, b) => a.date.localeCompare(b.date)),
  }
}
