import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { authApi, categoriesApi } from '@/api/endpoints'
import ProductsPage from '@/features/products/ProductsPage'
import { renderApp } from '@/test/render'
import i18n from '.'

describe('interfaz en inglés', () => {
  it('traduce la pantalla, las validaciones y los formatos', async () => {
    await i18n.changeLanguage('en')
    await authApi.login({ username: 'admin', password: 'admin1234' })
    const user = userEvent.setup()
    renderApp(<ProductsPage />)

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(screen.getAllByText('$7.90').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'New product' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('SKU is required')).toBeInTheDocument()
  })

  it('los errores del backend llegan en el idioma elegido', async () => {
    await i18n.changeLanguage('en')
    await authApi.login({ username: 'admin', password: 'admin1234' })
    await expect(categoriesApi.remove(1)).rejects.toThrow('The category has products assigned')
  })
})
