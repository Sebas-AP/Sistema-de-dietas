'use client'

export type AppSection = 'today' | 'week' | 'shopping' | 'preparation'

const sections: { id: AppSection; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Semana' },
  { id: 'shopping', label: 'Compras' },
  { id: 'preparation', label: 'Preparación' },
]

export function AppNavigation({
  active,
  onChange,
}: {
  active: AppSection
  onChange: (section: AppSection) => void
}) {
  return (
    <nav className="app-navigation" aria-label="Secciones principales">
      {sections.map(({ id, label }) => (
        <button
          className="app-navigation__button"
          key={id}
          type="button"
          aria-pressed={active === id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
