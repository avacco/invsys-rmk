import { request } from './client'
import type {
  Category, CategoryRequest, CreateUserRequest, LoginRequest, Me, Meta, Page, PageQuery, PermissionInfo,
  Product, ProductQuery, ProductRequest, Role, RoleRequest, Supplier, SupplierQuery, SupplierRequest,
  Unit, UnitRequest, UpdateUserRequest, User, Warehouse, WarehouseRequest, Movement, MovementQuery,
  MovementRequest, ProductStock, StockQuery, InventorySummary, AuditEntry, AuditQuery, ValuationGroup, ValuationRow,
  ActivityDay, TopProduct,
} from './types'

export const authApi = {
  login: (body: LoginRequest) => request<Me>('/auth/login', { method: 'POST', body, skipRefresh: true }),
  refresh: () => request<Me>('/auth/refresh', { method: 'POST', skipRefresh: true }),
  logout: () => request<void>('/auth/logout', { method: 'POST', skipRefresh: true }),
  me: () => request<Me>('/auth/me'),
}

export const metaApi = {
  get: () => request<Meta>('/meta', { skipRefresh: true }),
}

export const productsApi = {
  list: (query: ProductQuery) => request<Page<Product>>('/products', { query: { ...query } }),
  get: (id: number) => request<Product>(`/products/${id}`),
  create: (body: ProductRequest) => request<Product>('/products', { method: 'POST', body }),
  update: (id: number, body: ProductRequest) => request<Product>(`/products/${id}`, { method: 'PUT', body }),
  remove: (id: number) => request<void>(`/products/${id}`, { method: 'DELETE' }),
  uploadImage: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<Product>(`/products/${id}/image`, { method: 'POST', body: form })
  },
  removeImage: (id: number) => request<Product>(`/products/${id}/image`, { method: 'DELETE' }),
}

export const categoriesApi = {
  list: () => request<Category[]>('/categories'),
  create: (body: CategoryRequest) => request<Category>('/categories', { method: 'POST', body }),
  update: (id: number, body: CategoryRequest) => request<Category>(`/categories/${id}`, { method: 'PUT', body }),
  remove: (id: number) => request<void>(`/categories/${id}`, { method: 'DELETE' }),
}

export const unitsApi = {
  list: () => request<Unit[]>('/units'),
  create: (body: UnitRequest) => request<Unit>('/units', { method: 'POST', body }),
  update: (id: number, body: UnitRequest) => request<Unit>(`/units/${id}`, { method: 'PUT', body }),
  remove: (id: number) => request<void>(`/units/${id}`, { method: 'DELETE' }),
}

export const suppliersApi = {
  list: (query: SupplierQuery) => request<Page<Supplier>>('/suppliers', { query: { ...query } }),
  create: (body: SupplierRequest) => request<Supplier>('/suppliers', { method: 'POST', body }),
  update: (id: number, body: SupplierRequest) => request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body }),
  remove: (id: number) => request<void>(`/suppliers/${id}`, { method: 'DELETE' }),
}

export const usersApi = {
  list: (query: PageQuery) => request<Page<User>>('/users', { query: { ...query } }),
  create: (body: CreateUserRequest) => request<User>('/users', { method: 'POST', body }),
  update: (id: number, body: UpdateUserRequest) => request<User>(`/users/${id}`, { method: 'PUT', body }),
  remove: (id: number) => request<void>(`/users/${id}`, { method: 'DELETE' }),
}

export const rolesApi = {
  list: () => request<Role[]>('/roles'),
  create: (body: RoleRequest) => request<Role>('/roles', { method: 'POST', body }),
  update: (id: number, body: RoleRequest) => request<Role>(`/roles/${id}`, { method: 'PUT', body }),
  remove: (id: number) => request<void>(`/roles/${id}`, { method: 'DELETE' }),
  permissions: () => request<PermissionInfo[]>('/permissions'),
}

export const warehousesApi = {
  list: () => request<Warehouse[]>('/warehouses'),
  create: (body: WarehouseRequest) => request<Warehouse>('/warehouses', { method: 'POST', body }),
  update: (id: number, body: WarehouseRequest) => request<Warehouse>(`/warehouses/${id}`, { method: 'PUT', body }),
  remove: (id: number) => request<void>(`/warehouses/${id}`, { method: 'DELETE' }),
}

export const inventoryApi = {
  stock: (query: StockQuery) => request<Page<ProductStock>>('/inventory/stock', { query: { ...query } }),
  movements: (query: MovementQuery) => request<Page<Movement>>('/inventory/movements', { query: { ...query } }),
  register: (body: MovementRequest) => request<Movement[]>('/inventory/movements', { method: 'POST', body }),
  summary: () => request<InventorySummary>('/inventory/summary'),
}

export const auditApi = {
  list: (query: AuditQuery) => request<Page<AuditEntry>>('/audit', { query: { ...query } }),
}

export const reportsApi = {
  valuation: (groupBy: ValuationGroup) => request<ValuationRow[]>('/reports/valuation', { query: { groupBy } }),
  activity: (days: number, tz = Intl.DateTimeFormat().resolvedOptions().timeZone) =>
    request<ActivityDay[]>('/reports/activity', { query: { days, tz } }),
  topProducts: (days: number, limit = 10) => request<TopProduct[]>('/reports/top-products', { query: { days, limit } }),
}
