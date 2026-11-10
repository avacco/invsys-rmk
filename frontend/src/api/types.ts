/**
 * Tipos del contrato de la API (/api/v1). Reflejan los DTOs del backend.
 * Con el backend corriendo, `npm run api:types` genera schema.gen.d.ts desde /api/docs para compararlos.
 */

export interface AuditInfo {
  createdAt: string
  createdBy?: string
  updatedAt: string
  updatedBy?: string
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageQuery {
  page?: number
  size?: number
  sort?: string
}

/** Error RFC 9457 que devuelve el backend. */
export interface ProblemDetail {
  status: number
  title?: string
  detail?: string
  errors?: Record<string, string>
}

// --- Identidad ---

export type PermissionValue =
  | 'catalog:read'
  | 'catalog:write'
  | 'partners:read'
  | 'partners:write'
  | 'users:read'
  | 'users:write'
  | 'roles:read'
  | 'roles:write'

export interface Me {
  id: number
  username: string
  displayName: string
  email?: string
  role: string
  permissions: PermissionValue[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface Ref {
  id: number
  name: string
}

export interface User {
  id: number
  username: string
  displayName: string
  email?: string
  role: Ref
  enabled: boolean
  audit: AuditInfo
}

export interface CreateUserRequest {
  username: string
  displayName: string
  email?: string | null
  password: string
  roleId: number
  enabled?: boolean
}

export interface UpdateUserRequest {
  displayName: string
  email?: string | null
  password?: string | null
  roleId: number
  enabled: boolean
}

export interface Role {
  id: number
  name: string
  description?: string
  system: boolean
  permissions: PermissionValue[]
  audit: AuditInfo
}

export interface RoleRequest {
  name: string
  description?: string | null
  permissions: PermissionValue[]
}

export interface PermissionInfo {
  value: PermissionValue
  resource: string
}

// --- Catálogo ---

export interface Category {
  id: number
  name: string
  description?: string
  audit: AuditInfo
}

export interface CategoryRequest {
  name: string
  description?: string | null
}

export interface Unit {
  id: number
  code: string
  name: string
  decimals: number
}

export interface UnitRequest {
  code: string
  name: string
  decimals: number
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE'

export interface Product {
  id: number
  sku: string
  name: string
  description?: string
  category?: Ref
  unit: Unit
  supplier?: Ref
  costPrice: number
  salePrice: number
  minStock: number
  status: ProductStatus
  imageUrl?: string
  audit: AuditInfo
}

export interface ProductRequest {
  sku: string
  name: string
  description?: string | null
  categoryId?: number | null
  unitId: number
  supplierId?: number | null
  costPrice: number
  salePrice: number
  minStock?: number | null
  status: ProductStatus
}

export interface ProductQuery extends PageQuery {
  q?: string
  categoryId?: number
  supplierId?: number
  status?: ProductStatus
}

// --- Proveedores ---

export interface Supplier {
  id: number
  name: string
  taxId?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  active: boolean
  audit: AuditInfo
}

export interface SupplierRequest {
  name: string
  taxId?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  notes?: string | null
  active?: boolean
}

export interface SupplierQuery extends PageQuery {
  q?: string
  active?: boolean
}

export interface Meta {
  currency: string
}
