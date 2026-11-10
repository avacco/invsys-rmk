import { describe, expect, it } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { authApi } from '@/api/endpoints'
import { renderApp } from '@/test/render'
import ProductsPage from './ProductsPage'

describe('ProductsPage', () => {
  it('lista productos y permite crear uno nuevo', async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
    const user = userEvent.setup()
    renderApp(<ProductsPage />)

    expect(await screen.findByText('Aceite de oliva 500 ml')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /nuevo producto/i }))
    await user.type(screen.getByLabelText('SKU'), 'TST-001')
    await user.type(screen.getByLabelText('Nombre'), 'Producto de prueba')
    await user.clear(screen.getByLabelText('Precio de venta'))
    await user.type(screen.getByLabelText('Precio de venta'), '9.99')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Producto de prueba')).toBeInTheDocument()
  })

  it('oculta las acciones de edición para un usuario de solo lectura', async () => {
    await authApi.login({ username: 'viewer', password: 'viewer1234' })
    renderApp(<ProductsPage />)

    expect(await screen.findByText('Aceite de oliva 500 ml')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /nuevo producto/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
  })
})
