import { expect, test } from '@playwright/test'

// A one-page PDF assembled locally so browser tests never use a personal document.
function menuPdf(): Buffer {
  const content = 'BT /F1 12 Tf 72 720 Td (Lunes: Pollo con verduras) Tj ET\n'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}endstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  for (const [index, body] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(pdf)
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(pdf)
}

const draft = {
  planName: 'Menú de prueba', confidence: 0.96, needsVision: false, warnings: [],
  days: [
    { weekday: 'monday', meals: [{ slot: 'lunch', title: 'Pollo con verduras', ingredients: [{ name: 'Pollo', category: 'protein' }] }] },
    { weekday: 'tuesday', meals: [{ slot: 'dinner', title: 'Sopa', ingredients: [] }] },
    { weekday: 'wednesday', meals: [{ slot: 'breakfast', title: 'Fruta', ingredients: [] }] },
  ],
}

test('imports a reviewed text draft only after consent and confirmation', async ({ page }) => {
  const modes: string[] = []
  await page.route('**/api/import-diet', async (route) => {
    modes.push(route.request().postDataJSON().mode)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(draft) })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Semana' }).click()
  await page.getByRole('button', { name: 'Importar desde PDF' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar desde PDF' })
  await dialog.getByLabel('PDF para importar').setInputFiles({ name: 'menu.pdf', mimeType: 'application/pdf', buffer: menuPdf() })
  await dialog.getByRole('button', { name: 'Analizar PDF' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Acepta el envío')
  expect(modes).toEqual([])
  await dialog.getByLabel(/Acepto enviar/i).check()
  await dialog.getByRole('button', { name: 'Analizar PDF' }).click()
  await expect(dialog.getByRole('heading', { name: 'Revisar borrador' })).toBeVisible()
  expect(modes).toEqual(['text'])
  await expect(page.getByLabel('Nombre del plan', { exact: true })).not.toHaveValue('Menú de prueba')
  await dialog.getByRole('button', { name: 'Importar al plan' }).click()
  await expect(page.getByText('Pollo con verduras')).toBeVisible()
  await expect(page.getByLabel('Nombre del plan', { exact: true })).toHaveValue('Menú de prueba')
})

test('uses vision fallback only after consent and lets the user cancel', async ({ page }) => {
  const modes: string[] = []
  await page.route('**/api/import-diet', async (route) => {
    const mode = route.request().postDataJSON().mode
    modes.push(mode)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...draft, needsVision: mode === 'text' }) })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Semana' }).click()
  await page.getByRole('button', { name: 'Importar desde PDF' }).click()
  const dialog = page.getByRole('dialog', { name: 'Importar desde PDF' })
  await dialog.getByLabel('PDF para importar').setInputFiles({ name: 'menu.pdf', mimeType: 'application/pdf', buffer: menuPdf() })
  await dialog.getByLabel(/Acepto enviar/i).check()
  await dialog.getByRole('button', { name: 'Analizar PDF' }).click()
  await expect(dialog.getByRole('heading', { name: 'Revisar borrador' })).toBeVisible()
  expect(modes).toEqual(['text', 'vision'])
  await dialog.getByRole('button', { name: 'Cancelar importación' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Pollo con verduras')).toHaveCount(0)
})
