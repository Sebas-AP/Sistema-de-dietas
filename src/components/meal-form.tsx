'use client'

import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { validateMeal } from '../domain/meal-validation'
import type { GroceryCategory, Ingredient, Meal, MealSlot, PreparationAction } from '../domain/types'

export const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'morningSnack', label: 'Colación de la mañana' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'mainMeal', label: 'Comida' },
  { value: 'afternoonSnack', label: 'Colación de la tarde' },
  { value: 'dinner', label: 'Cena' },
]

const categories: { value: GroceryCategory; label: string }[] = [
  { value: 'produce', label: 'Frutas y verduras' },
  { value: 'protein', label: 'Proteínas' },
  { value: 'dairy', label: 'Lácteos' },
  { value: 'pantry', label: 'Despensa' },
  { value: 'other', label: 'Otros' },
]

const actions: { value: PreparationAction; label: string }[] = [
  { value: 'wash', label: 'Lavar' },
  { value: 'cut', label: 'Cortar' },
  { value: 'cook', label: 'Cocer' },
  { value: 'prep', label: 'Preparar' },
]

type IngredientDraft = {
  id: string
  name: string
  category: GroceryCategory | ''
  quantity: string
  unit: string
  preparationAction: PreparationAction | ''
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptyIngredient(): IngredientDraft {
  return { id: newId(), name: '', category: '', quantity: '', unit: '', preparationAction: '' }
}

function toDraft(ingredient: Ingredient): IngredientDraft {
  return {
    id: ingredient.id,
    name: ingredient.name,
    category: ingredient.category,
    quantity: ingredient.quantity === undefined ? '' : String(ingredient.quantity),
    unit: ingredient.unit ?? '',
    preparationAction: ingredient.preparationAction ?? '',
  }
}

export function MealForm({ day, meal, onSave, onCancel }: {
  day: string
  meal?: Meal
  onSave: (meal: Meal) => void
  onCancel?: () => void
}) {
  const formId = useId()
  const [slot, setSlot] = useState<MealSlot>(meal?.slot ?? 'breakfast')
  const [title, setTitle] = useState(meal?.title ?? '')
  const [time, setTime] = useState(meal?.time ?? '')
  const [notes, setNotes] = useState(meal?.notes ?? '')
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(meal?.ingredients.map(toDraft) ?? [emptyIngredient()])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function updateIngredient(index: number, patch: Partial<IngredientDraft>) {
    setIngredients((current) => current.map((item, position) => position === index ? { ...item, ...patch } : item))
  }

  function removeIngredient(index: number) {
    setIngredients((current) => current.filter((_, position) => position !== index))
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([field]) => !field.startsWith('ingredients.'))))
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next: Meal = {
      id: meal?.id ?? newId(), slot, title: title.trim(),
      ...(time ? { time } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ingredients: ingredients.map((item) => ({
        id: item.id,
        name: item.name.trim(),
        category: (item.category || 'other') as GroceryCategory,
        ...(item.quantity.trim() ? { quantity: Number(item.quantity) } : {}),
        ...(item.unit.trim() ? { unit: item.unit.trim() } : {}),
        ...(item.preparationAction ? { preparationAction: item.preparationAction } : {}),
      })),
    }
    const nextErrors = validateMeal(next)
    if (!next.title) nextErrors.title = 'Ingresa el nombre de la comida'
    ingredients.forEach((item, index) => {
      if (!item.category) nextErrors[`ingredients.${index}.category`] = 'Selecciona una categoría'
      if (item.quantity.trim() && (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0)) {
        nextErrors[`ingredients.${index}.quantity`] = 'Ingresa una cantidad mayor a cero'
      }
    })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onSave(next)
  }

  return (
    <form className="meal-form" onSubmit={save} noValidate>
      <p className="meal-form__date">{meal ? 'Editar comida' : 'Nueva comida'} · {day}</p>
      <div className="meal-form__grid">
        <div className="field">
          <label htmlFor={`${formId}-slot`}>Momento</label>
          <select id={`${formId}-slot`} value={slot} onChange={(event) => setSlot(event.target.value as MealSlot)}>
            {MEAL_SLOTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${formId}-time`}>Hora opcional</label>
          <input id={`${formId}-time`} type="time" value={time} onChange={(event) => setTime(event.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${formId}-title`}>Nombre de la comida</label>
        <input id={`${formId}-title`} autoFocus value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? `${formId}-title-error` : undefined} />
        {errors.title && <span className="field__error" id={`${formId}-title-error`}>{errors.title}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${formId}-notes`}>Notas opcionales</label>
        <textarea id={`${formId}-notes`} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </div>
      <fieldset className="meal-form__ingredients">
        <legend>Alimentos</legend>
        {ingredients.map((item, index) => (
          <div className="ingredient-row" key={item.id}>
            <div className="ingredient-row__heading"><strong>Alimento {index + 1}</strong>{ingredients.length > 1 && <button type="button" className="text-button" onClick={() => removeIngredient(index)}>Quitar alimento {index + 1}</button>}</div>
            <div className="field">
              <label htmlFor={`${formId}-name-${index}`}>Alimento{index > 0 ? ` ${index + 1}` : ''}</label>
              <input id={`${formId}-name-${index}`} value={item.name} onChange={(event) => updateIngredient(index, { name: event.target.value })} aria-invalid={Boolean(errors[`ingredients.${index}.name`])} aria-describedby={errors[`ingredients.${index}.name`] ? `${formId}-name-error-${index}` : undefined} />
              {errors[`ingredients.${index}.name`] && <span className="field__error" id={`${formId}-name-error-${index}`}>{errors[`ingredients.${index}.name`]}</span>}
            </div>
            <div className="meal-form__grid">
              <div className="field">
                <label htmlFor={`${formId}-category-${index}`}>Categoría{index > 0 ? ` ${index + 1}` : ''}</label>
                <select id={`${formId}-category-${index}`} value={item.category} onChange={(event) => updateIngredient(index, { category: event.target.value as GroceryCategory })} aria-invalid={Boolean(errors[`ingredients.${index}.category`])} aria-describedby={errors[`ingredients.${index}.category`] ? `${formId}-category-error-${index}` : undefined}>
                  <option value="">Selecciona una categoría</option>
                  {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {errors[`ingredients.${index}.category`] && <span className="field__error" id={`${formId}-category-error-${index}`}>{errors[`ingredients.${index}.category`]}</span>}
              </div>
              <div className="field">
                <label htmlFor={`${formId}-action-${index}`}>Preparación{index > 0 ? ` ${index + 1}` : ''}</label>
                <select id={`${formId}-action-${index}`} value={item.preparationAction} onChange={(event) => updateIngredient(index, { preparationAction: event.target.value as PreparationAction | '' })}>
                  <option value="">Ninguna</option>
                  {actions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
            <div className="meal-form__grid">
              <div className="field">
                <label htmlFor={`${formId}-quantity-${index}`}>Cantidad{index > 0 ? ` ${index + 1}` : ''}</label>
                <input id={`${formId}-quantity-${index}`} type="number" min="0" step="any" inputMode="decimal" value={item.quantity} onChange={(event) => updateIngredient(index, { quantity: event.target.value })} aria-invalid={Boolean(errors[`ingredients.${index}.quantity`])} aria-describedby={errors[`ingredients.${index}.quantity`] ? `${formId}-quantity-error-${index}` : undefined} />
                {errors[`ingredients.${index}.quantity`] && <span className="field__error" id={`${formId}-quantity-error-${index}`}>{errors[`ingredients.${index}.quantity`]}</span>}
              </div>
              <div className="field">
                <label htmlFor={`${formId}-unit-${index}`}>Unidad{index > 0 ? ` ${index + 1}` : ''}</label>
                <input id={`${formId}-unit-${index}`} value={item.unit} onChange={(event) => updateIngredient(index, { unit: event.target.value })} placeholder="pieza, taza, g…" />
              </div>
            </div>
          </div>
        ))}
        <button type="button" className="text-button" onClick={() => setIngredients((current) => [...current, emptyIngredient()])}>Agregar alimento</button>
      </fieldset>
      <div className="meal-form__actions">
        <button className="button button--primary" type="submit">Guardar comida</button>
        {onCancel && <button className="button button--quiet" type="button" onClick={onCancel}>Cancelar</button>}
      </div>
    </form>
  )
}
