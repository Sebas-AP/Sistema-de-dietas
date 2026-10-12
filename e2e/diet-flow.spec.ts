import { expect, test } from '@playwright/test'

test('user adds a meal, sees its purchase, and checks it off', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Semana' }).click()
  await page.getByRole('button', { name: /agregar comida/i }).first().click()
  await page.getByLabel('Nombre de la comida').fill('Pollo con verduras')
  await page.getByLabel('Alimento').fill('Pollo')
  await page.getByLabel('Categoría').selectOption('protein')
  await page.getByRole('button', { name: 'Guardar comida' }).click()
  await page.getByRole('button', { name: 'Compras' }).click()
  const chicken = page.getByRole('checkbox', { name: /pollo/i })
  await expect(chicken).toBeVisible()
  await chicken.check()
  await expect(chicken).toBeChecked()
})
