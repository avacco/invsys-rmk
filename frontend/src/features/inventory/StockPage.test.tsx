import { describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { authApi } from '@/api/endpoints'
import { renderApp } from '@/test/render'
import StockPage from './StockPage'

describe('StockPage', () => {
  it('registra una salida desde la fila del producto y actualiza el saldo', async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
    const user = userEvent.setup()
    renderApp(<StockPage />)

    const row = (await screen.findByText('Martillo carpintero')).closest('tr')!
    expect(within(row).getByText('Stock bajo')).toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: /registrar movimiento/i }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Salida' }))
    expect(await within(dialog).findByText(/Disponible en este almacén/)).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText(/Cantidad/))
    await user.type(within(dialog).getByLabelText(/Cantidad/), '2')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }))

    expect(await screen.findByText('1 u')).toBeInTheDocument()
  })

  it('valida la cantidad contra los decimales de la unidad', async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
    const user = userEvent.setup()
    renderApp(<StockPage />)

    const row = (await screen.findByText('Martillo carpintero')).closest('tr')!
    await user.click(within(row).getByRole('button', { name: /registrar movimiento/i }))
    const dialog = await screen.findByRole('dialog')
    await within(dialog).findByText(/Disponible en este almacén/)
    await user.type(within(dialog).getByLabelText(/Cantidad/), '1.5')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar' }))

    expect(await within(dialog).findByText(/no admite decimales/)).toBeInTheDocument()
  })
})
