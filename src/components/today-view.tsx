'use client'

import { useEffect, useState } from 'react'
import type { DietPlan, MealSlot } from '../domain/types'
import { millisecondsUntilNextMinute } from './today-clock'

const slotNames: Record<MealSlot, string> = {
  breakfast: 'Desayuno',
  morningSnack: 'Colación de la mañana',
  lunch: 'Almuerzo',
  mainMeal: 'Comida',
  afternoonSnack: 'Colación de la tarde',
  dinner: 'Cena',
}

function localDate(now: Date): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

function validTime(time: string | undefined): time is string {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return false
  return true
}

export function TodayView({ plan, now }: { plan: DietPlan; now?: Date }) {
  const [liveNow, setLiveNow] = useState(() => new Date())

  useEffect(() => {
    if (now) return
    const timer = setTimeout(() => setLiveNow(new Date()), millisecondsUntilNextMinute(new Date()))
    return () => clearTimeout(timer)
  }, [now, liveNow])

  const current = now ?? liveNow
  const day = plan.days.find((item) => item.date === localDate(current)) ?? plan.days[0]
  const meals = [...(day?.meals ?? [])].sort((a, b) => (validTime(a.time) ? a.time : '99:99').localeCompare(validTime(b.time) ? b.time : '99:99'))
  const currentTime = `${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`
  const next = meals.find((meal) => validTime(meal.time) && meal.time > currentTime)

  return (
    <section className="schedule" aria-labelledby="schedule-title">
      <div className="schedule__heading">
        <h2 id="schedule-title">Hoy</h2>
        <span>{meals.length === 1 ? '1 comida' : `${meals.length} comidas`}</span>
      </div>
      {next?.time && <p className="schedule__reminder" role="status">Próxima comida: <time dateTime={next.time}>{next.time}</time></p>}
      {meals.length === 0 ? (
        <div className="schedule__empty">
          <p>Todavía no hay comidas en el plan.</p>
          <p>Empieza por organizar tu semana.</p>
        </div>
      ) : (
        <ol className="schedule__list">
          {meals.map((meal) => (
            <li className="schedule__row" key={meal.id}>
              {meal.time ? <time className="schedule__time" dateTime={meal.time}>{meal.time}</time> : <span className="schedule__time">Sin hora</span>}
              <div>
                <span className="schedule__slot">{slotNames[meal.slot]}</span>
                <strong>{meal.title}</strong>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
