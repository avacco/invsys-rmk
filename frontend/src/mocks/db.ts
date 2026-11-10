import type { AuditInfo, Category, PermissionValue, Product, Role, Supplier, Unit, User } from '@/api/types'

/**
 * "Base de datos" del modo demo. Vive en memoria y se persiste en localStorage,
 * así los cambios sobreviven a una recarga. resetDemoData() vuelve a los datos iniciales.
 */

export interface DemoUser extends User {
  password: string
}

export interface DemoDb {
  seq: number
  roles: Role[]
  users: DemoUser[]
  categories: Category[]
  units: Unit[]
  suppliers: Supplier[]
  products: Product[]
}

const STORAGE_KEY = 'invsys-demo-db'
const VERSION_KEY = 'invsys-demo-db-version'
const VERSION = '1'

export const ALL_PERMISSIONS: PermissionValue[] = [
  'catalog:read', 'catalog:write', 'partners:read', 'partners:write',
  'users:read', 'users:write', 'roles:read', 'roles:write',
]

export function audit(by = 'system', at = new Date().toISOString()): AuditInfo {
  return { createdAt: at, createdBy: by, updatedAt: at, updatedBy: by }
}

function seed(): DemoDb {
  const a = audit('system', '2026-01-15T12:00:00Z')
  const roles: Role[] = [
    { id: 1, name: 'ADMIN', description: 'Acceso total al sistema', system: true, permissions: [...ALL_PERMISSIONS], audit: a },
    { id: 2, name: 'MANAGER', description: 'Gestiona catálogo y proveedores', system: false,
      permissions: ['catalog:read', 'catalog:write', 'partners:read', 'partners:write', 'users:read'], audit: a },
    { id: 3, name: 'VIEWER', description: 'Solo lectura', system: false, permissions: ['catalog:read', 'partners:read'], audit: a },
  ]
  const ref = (r: Role) => ({ id: r.id, name: r.name })
  const users: DemoUser[] = [
    { id: 1, username: 'admin', password: 'admin1234', displayName: 'Administrador', role: ref(roles[0]), enabled: true, audit: a },
    { id: 2, username: 'manager', password: 'manager1234', displayName: 'Gerente Demo', role: ref(roles[1]), enabled: true, audit: a },
    { id: 3, username: 'viewer', password: 'viewer1234', displayName: 'Consulta Demo', role: ref(roles[2]), enabled: true, audit: a },
  ]
  const categories: Category[] = [
    { id: 1, name: 'Alimentos', description: 'Productos comestibles y bebidas', audit: a },
    { id: 2, name: 'Limpieza', description: 'Artículos de limpieza e higiene', audit: a },
    { id: 3, name: 'Ferretería', description: 'Herramientas y materiales', audit: a },
    { id: 4, name: 'Indumentaria', description: 'Ropa y calzado de trabajo', audit: a },
  ]
  const units: Unit[] = [
    { id: 1, code: 'u', name: 'Unidad', decimals: 0 },
    { id: 2, code: 'box', name: 'Caja', decimals: 0 },
    { id: 3, code: 'kg', name: 'Kilogramo', decimals: 3 },
    { id: 4, code: 'g', name: 'Gramo', decimals: 0 },
    { id: 5, code: 'l', name: 'Litro', decimals: 3 },
    { id: 6, code: 'ml', name: 'Mililitro', decimals: 0 },
    { id: 7, code: 'm', name: 'Metro', decimals: 2 },
  ]
  const suppliers: Supplier[] = [
    { id: 1, name: 'Distribuidora Norte', taxId: 'NT-0001', email: 'ventas@norte.example', phone: '+00 111 1111', address: 'Av. Principal 100', notes: 'Entrega semanal', active: true, audit: a },
    { id: 2, name: 'Mayorista del Sur', taxId: 'MS-0002', email: 'pedidos@sur.example', phone: '+00 222 2222', address: 'Calle 2 #345', active: true, audit: a },
    { id: 3, name: 'Herramientas Centro', taxId: 'HC-0003', email: 'info@hcentro.example', phone: '+00 333 3333', address: 'Ruta 3 km 12', notes: 'Pago a 30 días', active: true, audit: a },
  ]
  const cat = (id: number) => ({ id, name: categories[id - 1].name })
  const sup = (id: number) => ({ id, name: suppliers[id - 1].name })
  const unit = (code: string) => units.find((u) => u.code === code)!
  const p = (id: number, sku: string, name: string, description: string, c: number, u: string, s: number | null,
    cost: number, price: number, min: number, status: Product['status'] = 'ACTIVE'): Product => ({
    id, sku, name, description, category: cat(c), unit: unit(u), supplier: s ? sup(s) : undefined,
    costPrice: cost, salePrice: price, minStock: min, status, audit: a,
  })
  const products: Product[] = [
    p(1, 'ALI-001', 'Aceite de oliva 500 ml', 'Extra virgen', 1, 'u', 1, 4.5, 7.9, 20),
    p(2, 'ALI-002', 'Arroz largo fino', 'Paquete de 1 kg', 1, 'u', 1, 0.9, 1.6, 50),
    p(3, 'ALI-003', 'Café en grano', 'Tostado medio', 1, 'kg', 2, 9, 15.5, 10),
    p(4, 'LIM-001', 'Detergente 750 ml', 'Concentrado', 2, 'u', 2, 1.2, 2.3, 30),
    p(5, 'LIM-002', 'Lavandina', 'Por litro, a granel', 2, 'l', 2, 0.4, 0.95, 100),
    p(6, 'FER-001', 'Martillo carpintero', 'Mango de fibra de vidrio', 3, 'u', 3, 6, 11, 5),
    p(7, 'FER-002', 'Tornillos 4x40', 'Caja x 100', 3, 'box', 3, 2.1, 3.8, 15),
    p(8, 'FER-003', 'Cable unipolar 2.5 mm', 'Rollo, venta por metro', 3, 'm', 3, 0.35, 0.7, 200),
    p(9, 'IND-001', 'Botas de seguridad', 'Puntera de acero', 4, 'u', null, 25, 42, 4),
    p(10, 'IND-002', 'Guantes de nitrilo', 'Discontinuado', 4, 'box', null, 3, 5.5, 0, 'INACTIVE'),
  ]
  return { seq: 100, roles, users, categories, units, suppliers, products }
}

let db: DemoDb | null = null

function load(): DemoDb {
  try {
    if (localStorage.getItem(VERSION_KEY) === VERSION) {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw) as DemoDb
    }
  } catch {
    // datos corruptos: se vuelve a sembrar
  }
  return seed()
}

export function getDb(): DemoDb {
  db ??= load()
  return db
}

/** Persiste los cambios. Si se supera la cuota (imágenes grandes), quedan solo en memoria. */
export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getDb()))
    localStorage.setItem(VERSION_KEY, VERSION)
  } catch {
    // QuotaExceededError
  }
}

export function nextId(): number {
  return ++getDb().seq
}

export function resetDemoData() {
  db = seed()
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(VERSION_KEY)
  } catch {
    // sin acceso a localStorage
  }
}
