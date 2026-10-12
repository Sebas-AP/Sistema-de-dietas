'use client'

import { useEffect, useRef, useState } from 'react'
import type { DietPlan, Meal } from '../domain/types'
import { useDietStore } from '../state/diet-store'
import { MealForm, MEAL_SLOTS } from './meal-form'
import { PdfAttachment } from './pdf-attachment'
import { isCalendarDate, rebaseWeek, safeWeekStart, weekDates } from './week-dates'

function dateLabel(date: string): string {
  const parts = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).formatToParts(new Date(`${date}T12:00:00Z`))
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('weekday')} ${get('day')} de ${get('month')}`
}

function saveMeal(current: DietPlan, start: string, date: string, meal: Meal): DietPlan {
  const existing = current.days.find((day) => day.date === date)
  const nextDay = {
    date,
    meals: existing?.meals.some((item) => item.id === meal.id)
      ? existing.meals.map((item) => item.id === meal.id ? meal : item)
      : [...(existing?.meals ?? []), meal],
  }
  return {
    ...current,
    startsOn: isCalendarDate(current.startsOn) ? current.startsOn : start,
    days: existing
      ? current.days.map((day) => day.date === date ? nextDay : day)
      : [...current.days, nextDay],
  }
}

export function WeeklyPlan() {
  const { plan, replacePlan, isHydrated } = useDietStore()
  const [editor, setEditor] = useState<{ date: string; meal?: Meal } | null>(null)
  const [waterDraft, setWaterDraft] = useState(plan.waterGoalLiters?.toString() ?? '')
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const dayHeadingRefs = useRef(new Map<string, HTMLHeadingElement>())
  const pendingFocusRef = useRef<{ date: string; useHeading: boolean } | null>(null)
  const start = safeWeekStart(plan.startsOn)
  const dates = weekDates(start)
  useEffect(() => setWaterDraft(plan.waterGoalLiters?.toString() ?? ''), [plan.waterGoalLiters])
  useEffect(() => {
    if (isHydrated && !isCalendarDate(plan.startsOn)) {
      replacePlan((current) => isCalendarDate(current.startsOn) ? current : rebaseWeek(current, start, start))
    }
  }, [isHydrated, plan.startsOn, replacePlan, start])
  useEffect(() => {
    const pending = pendingFocusRef.current
    if (!pending) return
    pendingFocusRef.current = null
    const origin = returnFocusRef.current
    const target = !pending.useHeading && origin?.isConnected ? origin : dayHeadingRefs.current.get(pending.date)
    target?.focus()
  }, [editor, plan])

  function closeEditor(date: string) {
    pendingFocusRef.current = { date, useHeading: false }
    setEditor(null)
  }

  function removeMeal(date: string, mealId: string) {
    pendingFocusRef.current = { date, useHeading: true }
    if (editor?.date === date && editor.meal?.id === mealId) setEditor(null)
    replacePlan((current) => ({
      ...current,
      days: current.days.map((day) => day.date === date
        ? { ...day, meals: day.meals.filter((meal) => meal.id !== mealId) }
        : day),
    }))
  }

  return (
    <section className="weekly-plan" aria-labelledby="section-title">
      <div className="weekly-plan__intro">
        <div>
          <p className="eyebrow">Tu cocina, día a día</p>
          <h2 id="section-title">Semana</h2>
          <p>Organiza cada comida y conserva tu PDF como referencia.</p>
        </div>
        <span className="weekly-plan__count">7 días</span>
      </div>
      <div className="weekly-plan__settings">
        <div className="field">
          <label htmlFor="plan-name">Nombre del plan</label>
          <input id="plan-name" value={plan.name} onChange={(event) => replacePlan((current) => ({ ...current, name: event.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="week-start">Inicio de la semana</label>
          <input id="week-start" type="date" value={start} onChange={(event) => {
            if (isCalendarDate(event.target.value)) {
              setEditor(null)
              replacePlan((current) => rebaseWeek(current, event.target.value, start))
            }
          }} />
        </div>
        <div className="field">
          <label htmlFor="water-goal">Meta de agua diaria (litros)</label>
          <input id="water-goal" type="number" min="0" step="0.1" inputMode="decimal" value={waterDraft} onChange={(event) => setWaterDraft(event.target.value)} onBlur={() => {
            if (!waterDraft || (Number.isFinite(Number(waterDraft)) && Number(waterDraft) > 0)) {
              replacePlan((current) => ({ ...current, waterGoalLiters: waterDraft ? Number(waterDraft) : undefined }))
            } else {
              setWaterDraft(plan.waterGoalLiters?.toString() ?? '')
            }
          }} />
        </div>
      </div>
      <PdfAttachment value={plan.attachment} onChange={(descriptor) => replacePlan((current) => ({ ...current, attachment: descriptor ?? undefined }))} />
      <div className="weekly-plan__days">
        {dates.map((date) => {
          const label = dateLabel(date)
          const day = plan.days.find((item) => item.date === date)
          const meals = day?.meals ?? []
          const activeSlots = MEAL_SLOTS.filter((slot) => meals.some((meal) => meal.slot === slot.value))
          return (
            <section className="week-day" key={date} aria-label={label}>
              <div className="week-day__heading">
                <div><time dateTime={date}>{date}</time><h3 tabIndex={-1} ref={(node) => { if (node) dayHeadingRefs.current.set(date, node); else dayHeadingRefs.current.delete(date) }}>{label}</h3></div>
                <span>{meals.length === 1 ? '1 comida' : `${meals.length} comidas`}</span>
              </div>
              {meals.length === 0 ? <p className="week-day__empty">Aún no hay comidas para este día.</p> : (
                <div className="week-day__slots">
                  {activeSlots.map((slot) => (
                    <div className="week-day__slot" key={slot.value}>
                      <h4>{slot.label}</h4>
                      {meals.filter((meal) => meal.slot === slot.value).map((meal) => (
                        <article className="meal-card" key={meal.id}>
                          <div className="meal-card__main">
                            <strong>{meal.title}</strong>
                            {meal.time && <time dateTime={meal.time}>{meal.time}</time>}
                            {meal.ingredients.length > 0 && <p>{meal.ingredients.map((ingredient) => ingredient.name).join(', ')}</p>}
                          </div>
                          <div className="meal-card__actions">
                            <button type="button" className="text-button" onClick={(event) => { returnFocusRef.current = event.currentTarget; setEditor({ date, meal }) }}>Editar {meal.title}</button>
                            <button type="button" className="text-button" onClick={() => removeMeal(date, meal.id)}>Eliminar {meal.title}</button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              )}
              <button type="button" className="button button--add" onClick={(event) => { returnFocusRef.current = event.currentTarget; setEditor({ date }) }}>Agregar comida · {label}</button>
              {editor?.date === date && <div className="week-day__editor"><MealForm key={`${date}-${editor.meal?.id ?? 'new'}`} day={date} meal={editor.meal} onSave={(meal) => { replacePlan((current) => saveMeal(current, start, date, meal)); closeEditor(date) }} onCancel={() => closeEditor(date)} /></div>}
            </section>
          )
        })}
      </div>
    </section>
  )
}
