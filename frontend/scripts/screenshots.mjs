// Genera las capturas del README a partir de la demo: `npm run screenshots` (con `npm run preview:demo` corriendo).
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = new URL('../../docs/screenshots/', import.meta.url).pathname

const shots = [
  { file: 'home.png', lang: 'es', dark: false, path: 'Inicio', wait: 'Últimos movimientos' },
  { file: 'stock-movement.png', lang: 'es', dark: false, path: 'Stock', wait: 'Martillo carpintero', movement: true },
  { file: 'reports-dark.png', lang: 'es', dark: true, path: 'Reportes', wait: 'Productos con más salidas' },
  { file: 'products-en.png', lang: 'en', dark: false, path: 'Products', wait: 'Aceite de oliva 500 ml' },
  { file: 'audit-en.png', lang: 'en', dark: true, path: 'Audit log', wait: 'Failed sign-in' },
]

const browser = await chromium.launch()
for (const shot of shots) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: shot.lang === 'en' ? 'en-US' : 'es-ES' })
  await context.addInitScript(([lang, dark]) => {
    localStorage.setItem('invsys-lang', lang)
    localStorage.setItem('invsys-ui', JSON.stringify({ state: { darkMode: dark, sidebarCollapsed: false, productView: 'grid' }, version: 0 }))
  }, [shot.lang, shot.dark])
  const page = await context.newPage()
  await page.goto(`${BASE}/login`)
  await page.locator('#username').fill('admin')
  await page.locator('#password').fill('admin1234')
  await page.locator('form button[type=submit]').click()
  await page.locator('aside nav').waitFor()
  await page.locator('aside nav').getByRole('link', { name: shot.path, exact: true }).click()
  await page.locator('main tbody, main .grid').getByText(shot.wait).first().waitFor()
  if (shot.movement) {
    await page.getByRole('row', { name: /Aceite de oliva/ }).getByRole('button').click()
    await page.getByRole('dialog').getByRole('button', { name: 'Transferencia entre almacenes' }).click()
    await page.locator('#m-target').selectOption({ label: 'Depósito Norte' })
    await page.locator('#m-qty').fill('5')
    await page.locator('#m-ref').fill('REM-0042')
  }
  await page.waitForTimeout(600)
  await page.screenshot({ path: OUT + shot.file })
  await context.close()
  console.log('✓', shot.file)
}
await browser.close()
