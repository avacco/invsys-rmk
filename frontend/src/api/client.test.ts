import { describe, expect, it } from 'vitest'
import { authApi, categoriesApi, productsApi } from './endpoints'
import { ApiError } from './client'

describe('cliente de la API (contra el backend simulado)', () => {
  it('rechaza credenciales inválidas con 401', async () => {
    await expect(authApi.login({ username: 'admin', password: 'mal' })).rejects.toMatchObject({ status: 401 })
  })

  it('exige sesión para los endpoints protegidos', async () => {
    const error = await productsApi.list({}).catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(401)
  })

  it('pagina y filtra productos', async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
    const page = await productsApi.list({ q: 'fer', size: 2 })
    expect(page.totalElements).toBe(3)
    expect(page.content).toHaveLength(2)
    expect(page.totalPages).toBe(2)
  })

  it('devuelve errores por campo con 400', async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
    const error = await productsApi
      .create({ sku: '', name: '', unitId: 1, costPrice: -1, salePrice: 1, status: 'ACTIVE' })
      .catch((e) => e)
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toHaveProperty('sku')
    expect(error.fieldErrors).toHaveProperty('costPrice')
  })

  it('impide borrar una categoría en uso (409)', async () => {
    await authApi.login({ username: 'admin', password: 'admin1234' })
    await expect(categoriesApi.remove(1)).rejects.toMatchObject({ status: 409 })
  })

  it('aplica los permisos del rol (403 para VIEWER)', async () => {
    await authApi.login({ username: 'viewer', password: 'viewer1234' })
    await expect(productsApi.list({})).resolves.toBeDefined()
    await expect(categoriesApi.create({ name: 'Nueva' })).rejects.toMatchObject({ status: 403 })
  })
})
