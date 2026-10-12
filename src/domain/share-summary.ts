import { buildPreparationList, buildShoppingList } from './plan-derivations'
import type { DietPlan, GroceryCategory, PreparationAction } from './types'

export type ShareSection = 'shopping' | 'preparation'

const categoryLabels: Record<GroceryCategory, string> = {
  produce: 'Frutas y verduras',
  protein: 'Proteínas',
  dairy: 'Lácteos',
  pantry: 'Despensa',
  other: 'Otros',
}

const actionLabels: Record<PreparationAction, string> = {
  wash: 'Lavar',
  cut: 'Cortar',
  cook: 'Cocer',
  prep: 'Preparar',
}

function formatDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : isoDate
}

function dateRange(plan: DietPlan): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(plan.startsOn)) return undefined
  const start = new Date(`${plan.startsOn}T00:00:00Z`)
  if (Number.isNaN(start.getTime())) return undefined
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  return `Semana del ${formatDate(plan.startsOn)} al ${formatDate(end.toISOString().slice(0, 10))}`
}

export function formatShareSummary(plan: DietPlan, section: ShareSection): string {
  const lines = [plan.name.trim() || 'Mi plan semanal']
  const range = dateRange(plan)
  if (range) lines.push(range)
  lines.push('', section === 'shopping' ? 'Lista de compras' : 'Lista de preparación')

  if (section === 'shopping') {
    let previousCategory: GroceryCategory | undefined
    for (const item of buildShoppingList(plan)) {
      if (item.category !== previousCategory) {
        lines.push(categoryLabels[item.category])
        previousCategory = item.category
      }
      const amount = item.quantity !== undefined ? ` — ${item.quantity}${item.unit ? ` ${item.unit}` : ''}` : ''
      lines.push(`• ${item.name}${amount}`)
    }
  } else {
    for (const item of buildPreparationList(plan)) {
      lines.push(`• ${actionLabels[item.action]} ${item.name} — ${formatDate(item.date)}`)
    }
  }

  return lines.join('\n')
}
