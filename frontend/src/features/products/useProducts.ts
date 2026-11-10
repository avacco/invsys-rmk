import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesApi, productsApi, suppliersApi, unitsApi } from '@/api/endpoints'
import type { ProductQuery, ProductRequest } from '@/api/types'

export function useProductList(query: ProductQuery) {
  return useQuery({
    queryKey: ['products', 'list', query],
    queryFn: () => productsApi.list(query),
    placeholderData: keepPreviousData,
  })
}

/** Opciones para los selectores del formulario y los filtros. */
export function useCatalogOptions(includeSuppliers: boolean) {
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const units = useQuery({ queryKey: ['units'], queryFn: unitsApi.list })
  const suppliers = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: () => suppliersApi.list({ size: 100, sort: 'name' }),
    enabled: includeSuppliers,
  })
  return {
    categories: categories.data ?? [],
    units: units.data ?? [],
    suppliers: suppliers.data?.content ?? [],
  }
}

export function useSaveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, body, image }: { id?: number; body: ProductRequest; image?: File | null }) => {
      const saved = id ? await productsApi.update(id, body) : await productsApi.create(body)
      return image ? productsApi.uploadImage(saved.id, image) : saved
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useRemoveProductImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => productsApi.removeImage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
