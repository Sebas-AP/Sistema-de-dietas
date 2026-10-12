'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { buildPreparationList, buildShoppingList } from '../domain/plan-derivations'
import type { DietPlan } from '../domain/types'
import { EMPTY_PLAN, LocalPlanRepository } from '../storage/local-plan-repository'

type PlanUpdate = DietPlan | ((current: DietPlan) => DietPlan)

type DietStore = {
  plan: DietPlan
  isHydrated: boolean
  replacePlan: (next: PlanUpdate) => void
  completion: Record<string, boolean>
  toggleCompletion: (key: string) => void
}

const DietStoreContext = createContext<DietStore | null>(null)

function completionForPlan(
  plan: DietPlan,
  repository: LocalPlanRepository,
  previous: Record<string, boolean>,
): Record<string, boolean> {
  const next: Record<string, boolean> = {}
  const keys = [
    ...buildShoppingList(plan).map((item) => item.key),
    ...buildPreparationList(plan).map((item) => item.key),
  ]

  for (const key of keys) {
    next[key] = previous[key] ?? repository.loadCompletion(key)
  }

  return next
}

export function DietProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository?: LocalPlanRepository
}) {
  const [storeRepository] = useState(() => repository ?? new LocalPlanRepository())
  const [plan, setPlan] = useState<DietPlan>(() => ({ ...EMPTY_PLAN, days: [] }))
  const [isHydrated, setIsHydrated] = useState(false)
  const [completion, setCompletion] = useState<Record<string, boolean>>({})
  const planRef = useRef(plan)
  const completionRef = useRef(completion)

  useEffect(() => {
    const loaded = storeRepository.load()
    const loadedCompletion = completionForPlan(loaded, storeRepository, completionRef.current)
    planRef.current = loaded
    completionRef.current = loadedCompletion
    setPlan(loaded)
    setCompletion(loadedCompletion)
    setIsHydrated(true)
  }, [storeRepository])

  const replacePlan = useCallback((update: PlanUpdate) => {
    const next = typeof update === 'function' ? update(planRef.current) : update
    storeRepository.save(next)
    const nextCompletion = completionForPlan(next, storeRepository, completionRef.current)
    for (const key of Object.keys(completionRef.current)) {
      if (!(key in nextCompletion)) storeRepository.saveCompletion(key, false)
    }
    planRef.current = next
    setPlan(next)
    completionRef.current = nextCompletion
    setCompletion(nextCompletion)
  }, [storeRepository])

  const toggleCompletion = useCallback((key: string) => {
    const current = completionRef.current[key] ?? storeRepository.loadCompletion(key)
    const complete = !current
    storeRepository.saveCompletion(key, complete)
    const next = { ...completionRef.current, [key]: complete }
    completionRef.current = next
    setCompletion(next)
  }, [storeRepository])

  return (
    <DietStoreContext.Provider value={{ plan, isHydrated, replacePlan, completion, toggleCompletion }}>
      {children}
    </DietStoreContext.Provider>
  )
}

export function useDietStore(): DietStore {
  const store = useContext(DietStoreContext)
  if (!store) throw new Error('useDietStore debe usarse dentro de DietProvider')
  return store
}
