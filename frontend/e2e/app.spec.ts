import { expect, goTo, login, test } from './fixtures'

test.describe('sesión', () => {
  test('inicia sesión, mantiene la sesión al recargar y la cierra', async ({ page }) => {
    await login(page)
    await expect(page.getByText('Valor del inventario (al costo)')).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: 'Hola, Administrador' })).toBeVisible()

    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await page.goto('/products')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('rechaza credenciales incorrectas', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Nombre de usuario').fill('admin')
    await page.getByLabel('Contraseña').fill('incorrecta')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos')
  })
})

test('flujo completo: crear un producto, darle stock y verlo en el historial y la auditoría', async ({ page }) => {
  await login(page)

  await goTo(page, 'Productos')
  await page.getByRole('button', { name: 'Nuevo producto' }).click()
  const form = page.getByRole('dialog')
  await form.getByLabel('SKU').fill('E2E-001')
  await form.getByLabel('Nombre').fill('Producto de prueba E2E')
  await form.getByLabel('Costo').fill('10')
  await form.getByLabel('Precio de venta').fill('15')
  await form.getByLabel('Stock mínimo').fill('5')
  await form.getByRole('button', { name: 'Guardar' }).click()
  await expect(form).toBeHidden()
  await expect(page.getByText('Producto de prueba E2E')).toBeVisible()

  await goTo(page, 'Stock')
  await page.getByRole('button', { name: 'Registrar movimiento', exact: true }).click()
  const movement = page.getByRole('dialog')
  await movement.getByLabel('Producto').selectOption({ label: 'E2E-001 — Producto de prueba E2E' })
  await movement.getByLabel(/^Cantidad/).fill('12')
  await movement.getByLabel('Referencia (opcional)').fill('REM-0001')
  await movement.getByRole('button', { name: 'Registrar', exact: true }).click()
  await expect(movement).toBeHidden()

  const row = page.getByRole('row', { name: /Producto de prueba E2E/ })
  await expect(row).toContainText('12 u')
  await expect(row).toContainText('OK')

  await goTo(page, 'Movimientos')
  await expect(page.getByRole('row', { name: /Producto de prueba E2E/ }).first()).toContainText('+12 u')

  await goTo(page, 'Auditoría')
  await expect(page.getByRole('row', { name: /Creación.*Producto de prueba E2E \(E2E-001\)/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Movimiento de stock.*Entrada · 12 u/ })).toBeVisible()
})

test('no permite vender más de lo que hay en stock', async ({ page }) => {
  await login(page)
  await goTo(page, 'Stock')
  await page.getByRole('row', { name: /Martillo carpintero/ }).getByRole('button', { name: /Registrar movimiento/ }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Salida' }).click()
  await dialog.getByLabel(/^Cantidad/).fill('50')
  await dialog.getByRole('button', { name: 'Registrar', exact: true }).click()
  await expect(page.getByText(/Stock insuficiente en Almacén principal/)).toBeVisible()
  await expect(dialog).toBeVisible()
})

test('un usuario de solo lectura no ve acciones de edición ni secciones restringidas', async ({ page }) => {
  await login(page, 'viewer')
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await expect(nav.getByRole('link', { name: 'Productos', exact: true })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Auditoría' })).toHaveCount(0)

  await goTo(page, 'Productos')
  await expect(page.getByText('Aceite de oliva 500 ml')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo producto' })).toHaveCount(0)

  await page.goto('/audit')
  await expect(page.getByText('Acceso denegado')).toBeVisible()
})

test('cambia el idioma a inglés y lo recuerda', async ({ page }) => {
  await login(page)
  await page.getByLabel('Idioma').selectOption('en')
  await expect(page.getByRole('heading', { name: 'Hello, Administrador' })).toBeVisible()
  await expect(page.getByText('Inventory value (at cost)')).toBeVisible()

  await page.reload()
  await goTo(page, 'Reports')
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  await expect(page.getByText('Top products by issues')).toBeVisible()
})

test('el modo oscuro se mantiene al navegar', async ({ page }) => {
  await login(page)
  await page.getByRole('button', { name: 'Cambiar tema' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await goTo(page, 'Reportes')
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
})

test('"Restablecer datos" vuelve a los datos iniciales de la demo', async ({ page }) => {
  await login(page)
  await goTo(page, 'Categorías y unidades')
  await page.getByRole('button', { name: 'Nueva' }).first().click()
  await page.getByRole('dialog').getByLabel('Nombre').fill('Temporal')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByRole('cell', { name: 'Temporal', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Restablecer datos' }).click()
  await expect(page.getByRole('cell', { name: 'Alimentos', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Temporal', exact: true })).toHaveCount(0)
})
