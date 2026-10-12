import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DietPlan } from '../domain/types'
import { TodayView } from './today-view'

const plan: DietPlan = {
  id: 'plan', name: 'Semana', startsOn: '2026-10-12', days: [
    { date: '2026-10-11', meals: [{ id: 'previous', slot: 'dinner', time: '20:00', title: 'Cena anterior', ingredients: [] }] },
    { date: '2026-10-12', meals: [
      { id: 'later', slot: 'mainMeal', time: '13:00', title: 'Pollo', ingredients: [] },
      { id: 'now', slot: 'breakfast', time: '12:00', title: 'Avena', ingredients: [] },
      { id: 'untimed', slot: 'dinner', title: 'Sopa', ingredients: [] },
    ] },
  ],
}

describe('TodayView', () => {
  afterEach(() => vi.useRealTimers())

  it('shows the next timed meal strictly after the current local time', () => {
    render(<TodayView plan={plan} now={new Date('2026-10-12T12:00:00')} />)
    expect(screen.getByRole('status')).toHaveTextContent('Próxima comida: 13:00')
    expect(screen.getByText('Pollo')).toBeVisible()
    expect(screen.queryByText('Cena anterior')).not.toBeInTheDocument()
  })

  it('uses the first planned day when today has no entry and skips a reminder without future times', () => {
    render(<TodayView plan={plan} now={new Date('2026-10-13T21:00:00')} />)
    expect(screen.getByText('Cena anterior')).toBeVisible()
    expect(screen.queryByText(/Próxima comida:/)).not.toBeInTheDocument()
  })

  it('gives an empty plan a route toward the weekly editor', () => {
    render(<TodayView plan={{ ...plan, days: [] }} now={new Date('2026-10-12T12:00:00')} />)
    expect(screen.getByText('Todavía no hay comidas en el plan.')).toBeVisible()
    expect(screen.getByText('Empieza por organizar tu semana.')).toBeVisible()
  })

  it('expires a reminder when its minute arrives without another render', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T12:59:59'))
    render(<TodayView plan={plan} />)
    expect(screen.getByRole('status')).toHaveTextContent('Próxima comida: 13:00')
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText(/Próxima comida:/)).not.toBeInTheDocument()
  })

  it('switches to the new day at midnight while the view stays open', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T23:59:59'))
    const midnightPlan: DietPlan = {
      ...plan, days: [
        { date: '2026-10-12', meals: [{ id: 'late', slot: 'dinner', title: 'Cena del lunes', ingredients: [] }] },
        { date: '2026-10-13', meals: [{ id: 'early', slot: 'breakfast', time: '08:00', title: 'Desayuno del martes', ingredients: [] }] },
      ],
    }
    render(<TodayView plan={midnightPlan} />)
    expect(screen.getByText('Cena del lunes')).toBeVisible()
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Cena del lunes')).not.toBeInTheDocument()
    expect(screen.getByText('Desayuno del martes')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Próxima comida: 08:00')
  })

  it('clears its pending clock update when the view closes', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-12T12:59:59'))
    const { unmount } = render(<TodayView plan={plan} />)
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
