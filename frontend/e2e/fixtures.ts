import { expect, test as base, type Page } from '@playwright/test'

export const USERS = {
  admin: { username: 'admin', password: 'admin1234' },
  manager: { username: 'manager', password: 'manager1234' },
  viewer: { username: 'viewer', password: 'viewer1234' },
} as const

export async function login(page: Page, user: keyof typeof USERS = 'admin') {
  await page.goto('/login')
  await page.getByLabel('Nombre de usuario').fill(USERS[user].username)
  await page.getByLabel('Contraseña').fill(USERS[user].password)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: /^Hola,/ })).toBeVisible()
}

export async function goTo(page: Page, link: string) {
  // Por estructura y no por etiqueta, así funciona en cualquier idioma.
  await page.locator('aside nav').getByRole('link', { name: link, exact: true }).click()
}

export const test = base
export { expect }
