'use client'

import { buildPreparationList, buildShoppingList } from '../domain/plan-derivations'
import { formatShareSummary } from '../domain/share-summary'
import type { ShareSection } from '../domain/share-summary'
import type { DietPlan, GroceryCategory, PreparationAction } from '../domain/types'
import { useDietStore } from '../state/diet-store'
import { ShareButton } from './share-button'

const categoryLabels: Record<GroceryCategory, string> = {
  produce: 'Frutas y verduras', protein: 'Proteínas', dairy: 'Lácteos', pantry: 'Despensa', other: 'Otros',
}
const actionLabels: Record<PreparationAction, string> = {
  wash: 'Lavar', cut: 'Cortar', cook: 'Cocer', prep: 'Preparar',
}
const categories: GroceryCategory[] = ['produce', 'protein', 'dairy', 'pantry', 'other']
const actions: PreparationAction[] = ['wash', 'cut', 'cook', 'prep']

function shortDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDate
}

export function DerivedList({ kind, plan }: { kind: ShareSection; plan: DietPlan }) {
  const { completion, toggleCompletion } = useDietStore()
  const shopping = kind === 'shopping' ? buildShoppingList(plan) : []
  const preparation = kind === 'preparation' ? buildPreparationList(plan) : []
  const hasItems = kind === 'shopping' ? shopping.length > 0 : preparation.length > 0

  return (
    <section className="derived-list" aria-labelledby="section-title">
      <div className="derived-list__heading">
        <h2 id="section-title">{kind === 'shopping' ? 'Compras' : 'Preparación'}</h2>
        <span>{kind === 'shopping' ? shopping.length : preparation.length} {kind === 'shopping' ? 'alimentos' : 'tareas'}</span>
      </div>
      {!hasItems ? (
        <p className="derived-list__empty">{kind === 'shopping'
          ? 'No hay alimentos en la lista. Agrega ingredientes en Semana para preparar tus compras.'
          : 'No hay tareas de preparación. Asigna una acción a un ingrediente en Semana.'}</p>
      ) : (
        <>
          <div className="derived-list__groups">
            {kind === 'shopping' ? categories.map((category) => {
              const items = shopping.filter((item) => item.category === category)
              if (items.length === 0) return null
              return (
                <fieldset className="derived-list__group" key={category}>
                  <legend>{categoryLabels[category]}</legend>
                  <ul>{items.map((item) => (
                    <li key={item.key}>
                      <label className="derived-list__row">
                        <input type="checkbox" checked={completion[item.key] ?? false} onChange={() => toggleCompletion(item.key)} />
                        <span className="derived-list__name">{item.name}</span>
                        {item.quantity !== undefined && <span className="derived-list__detail">{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>}
                      </label>
                    </li>
                  ))}</ul>
                </fieldset>
              )
            }) : actions.map((action) => {
              const items = preparation.filter((item) => item.action === action)
              if (items.length === 0) return null
              return (
                <fieldset className="derived-list__group" key={action}>
                  <legend>{actionLabels[action]}</legend>
                  <ul>{items.map((item) => (
                    <li key={item.key}>
                      <label className="derived-list__row">
                        <input type="checkbox" checked={completion[item.key] ?? false} onChange={() => toggleCompletion(item.key)} />
                        <span className="derived-list__name">{item.name}</span>
                        <time className="derived-list__detail" dateTime={item.date}>{shortDate(item.date)}</time>
                      </label>
                    </li>
                  ))}</ul>
                </fieldset>
              )
            })}
          </div>
          <ShareButton text={formatShareSummary(plan, kind)} />
        </>
      )}
    </section>
  )
}
