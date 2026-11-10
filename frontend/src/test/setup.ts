import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'
import { resetDemoData } from '@/mocks/db'
import i18n from '@/i18n'

/** Los tests usan los mismos handlers que la demo, así se verifica también el backend simulado. */
export const server = setupServer(...handlers)

beforeAll(async () => {
  server.listen({ onUnhandledRequest: 'error' })
  await i18n.changeLanguage('es')
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetDemoData()
  sessionStorage.clear()
  localStorage.clear()
  void i18n.changeLanguage('es')
})
afterAll(() => server.close())
