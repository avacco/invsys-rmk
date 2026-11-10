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
  code?: string
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
  | 'inventory:read'
  | 'inventory:write'
  | 'audit:read'

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

// --- Inventario ---

export interface Warehouse {
  id: number
  code: string
  name: string
  address?: string
  active: boolean
  audit: AuditInfo
}

export interface WarehouseRequest {
  code: string
  name: string
  address?: string | null
  active?: boolean
}

export interface WarehouseRef {
  id: number
  code: string
  name: string
}

export interface StockProductRef {
  id: number
  sku: string
  name: string
  unitCode: string
  unitDecimals: number
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER_OUT' | 'TRANSFER_IN'
export type MovementKind = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER'

export interface MovementRequest {
  type: MovementKind
  productId: number
  warehouseId: number
  targetWarehouseId?: number | null
  /** En ADJUSTMENT es el saldo contado; en el resto, la cantidad (> 0). */
  quantity: number
  reason?: string | null
  reference?: string | null
}

export interface Movement {
  id: number
  type: MovementType
  product: StockProductRef
  warehouse: WarehouseRef
  quantity: number
  balanceAfter: number
  reason?: string
  reference?: string
  transferGroup?: string
  createdAt: string
  createdBy?: string
}

export interface MovementQuery extends PageQuery {
  productId?: number
  warehouseId?: number
  type?: MovementType
}

export interface ProductStock {
  product: StockProductRef
  minStock: number
  total: number
  low: boolean
  levels: { warehouse: WarehouseRef; quantity: number }[]
}

export interface StockQuery extends PageQuery {
  q?: string
  categoryId?: number
  lowOnly?: boolean
}

export interface InventorySummary {
  inventoryValue: number
  lowStockProducts: number
  movementsLast7Days: number
  activeWarehouses: number
}

// --- Auditoría ---

export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK_MOVEMENT' | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'SESSION_REVOKED'

export interface AuditEntry {
  id: number
  occurredAt: string
  actor?: string
  action: AuditAction
  entityType?: string
  entityId?: string
  /** Descriptor neutral respecto del idioma (nombre, SKU, cantidades). */
  summary?: string
}

export interface AuditQuery extends PageQuery {
  actor?: string
  action?: AuditAction
  entityType?: string
  entityId?: string
  q?: string
  from?: string
  to?: string
}

// --- Reportes ---

export type ValuationGroup = 'CATEGORY' | 'WAREHOUSE'

export interface ValuationRow {
  /** null en "sin categoría". */
  id: number | null
  name: string | null
  products: number
  costValue: number
  saleValue: number
}

export interface ActivityDay {
  date: string
  inValue: number
  outValue: number
  adjustmentValue: number
  movements: number
}

export interface TopProduct {
  product: StockProductRef
  outQuantity: number
  outValue: number
  movements: number
}
