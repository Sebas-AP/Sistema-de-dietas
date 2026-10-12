'use client'

import { useEffect, useRef, useState } from 'react'
import { AppNavigation } from '../components/app-navigation'
import { DerivedList } from '../components/derived-list'
import { TodayView } from '../components/today-view'
import { WeeklyPlan } from '../components/weekly-plan'
import type { AppSection } from '../components/app-navigation'
import { DietProvider, useDietStore } from '../state/diet-store'

function AppShell() {
  const [active, setActive] = useState<AppSection>('today')
  const { isHydrated, plan } = useDietStore()
  const mainRef = useRef<HTMLElement>(null)
  const pendingFocusRef = useRef(false)

  useEffect(() => {
    if (pendingFocusRef.current && isHydrated) {
      mainRef.current?.focus()
      pendingFocusRef.current = false
    }
  }, [active, isHydrated])

  function changeSection(section: AppSection) {
    if (section === active) return
    pendingFocusRef.current = true
    setActive(section)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido">Ir al contenido</a>
      <aside className="app-shell__sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">✳</span>
          <span>Mi cocina</span>
        </div>
        <AppNavigation active={active} onChange={changeSection} />
        <p className="sidebar-note">Un lugar para tener la semana en orden.</p>
      </aside>
      <div className="app-shell__body">
        <header className="page-header">
          <p className="page-header__intro">Tu plan, a tu ritmo</p>
          <h1>Mi dieta semanal</h1>
        </header>
        <main
          id="contenido"
          ref={mainRef}
          tabIndex={-1}
          aria-busy={!isHydrated}
          aria-labelledby={!isHydrated ? 'loading-title' : active === 'today' ? 'schedule-title' : 'section-title'}
        >
          {!isHydrated ? (
            <section className="loading-state" role="status" aria-labelledby="loading-title">
              <h2 id="loading-title">Cargando tu plan</h2>
            </section>
          ) : active === 'today' ? <TodayView plan={plan} /> : active === 'week' ? <WeeklyPlan />
            : <DerivedList kind={active} plan={plan} />}
        </main>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <DietProvider>
      <AppShell />
    </DietProvider>
  )
}
