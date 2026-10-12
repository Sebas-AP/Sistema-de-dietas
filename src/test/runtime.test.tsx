import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import type {} from 'vitest/jsdom'

it('transforms JSX with the automatic React runtime', () => {
  expect(renderToStaticMarkup(<span>Listo</span>)).toBe('<span>Listo</span>')
})

it('provides browser localStorage to tests', () => {
  expect(localStorage).toBe(jsdom.window.localStorage)
  localStorage.setItem('runtime-check', 'available')
  try {
    expect(localStorage.getItem('runtime-check')).toBe('available')
  } finally {
    localStorage.removeItem('runtime-check')
  }
})
