import { http, HttpResponse, type PathParams } from 'msw'
import i18n from '@/i18n'
import { API_BASE } from '@/api/client'
import type {
  ActivityDay, AuditAction, AuditEntry, TopProduct, ValuationRow,
  InventorySummary, Movement, MovementRequest, MovementType, ProductStock, Warehouse, WarehouseRequest,
  AuditInfo, CategoryRequest, CreateUserRequest, Me, PermissionInfo, PermissionValue, Product, ProductRequest, Role,
  RoleRequest, Supplier, SupplierRequest, UnitRequest, UpdateUserRequest, User,
} from '@/api/types'
import { ALL_PERMISSIONS, audit, getDb, nextId, persist, type DemoUser } from './db'

/**
 * Backend simulado. Imita el contrato de la API real: mismas rutas, permisos y códigos de error
 * (401 sin sesión, 403 sin permiso, 400 datos inválidos, 404 inexistente, 409 conflicto).
 */

const SESSION_KEY = 'invsys-demo-session'
const base = API_BASE.startsWith('http') ? API_BASE : `*${API_BASE}`
const url = (path: string) => `${base}${path}`

// ---------- utilidades ----------

/** Mensaje traducible: texto en español (clave de i18n) y, si hace falta, sus variables. */
type Message = string | [string, Record<string, unknown>]

/** Como el backend real, responde los errores en el idioma de la interfaz. */
function problem(status: number, detail: Message, errors?: Record<string, string>) {
  const message = Array.isArray(detail) ? i18n.t(detail[0], detail[1]) : i18n.t(detail)
  const translatedErrors = errors && Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, i18n.t(v)]))
  return HttpResponse.json({ status, title: message, detail: message, ...(translatedErrors ? { errors: translatedErrors } : {}) }, { status })
}

class HttpError extends Error {
  constructor(readonly status: number, readonly detail: Message, readonly errors?: Record<string, string>) {
    super(Array.isArray(detail) ? detail[0] : detail)
  }
}

const fail = (status: number, message: Message, errors?: Record<string, string>): never => {
  throw new HttpError(status, message, errors)
}

function sessionUser(): DemoUser | null {
  const username = sessionStorage.getItem(SESSION_KEY)
  return getDb().users.find((u) => u.username === username && u.enabled) ?? null
}

function permissionsOf(user: DemoUser): PermissionValue[] {
  return getDb().roles.find((r) => r.id === user.role.id)?.permissions ?? []
}

function toMe(user: DemoUser): Me {
  return { id: user.id, username: user.username, displayName: user.displayName, email: user.email,
    role: user.role.name, permissions: [...permissionsOf(user)].sort() }
}

function publicUser(u: DemoUser): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...rest } = u
  return rest
}

function log(actor: string, action: AuditAction, entityType: string | undefined, entityId: number | string | undefined, summary?: string) {
  const entry: AuditEntry = {
    id: nextId(), occurredAt: new Date().toISOString(), actor, action, entityType,
    entityId: entityId === undefined ? undefined : String(entityId), summary,
  }
  getDb().audit.push(entry)
}

const RESOURCE_TYPES: Record<string, string> = {
  products: 'product', categories: 'category', units: 'unit', suppliers: 'supplier',
  users: 'user', roles: 'role', warehouses: 'warehouse',
}

/** Mismo descriptor que usa el backend real para cada tipo de entidad. */
function describe(type: string, id: number): string | undefined {
  const db = getDb()
  switch (type) {
    case 'product': { const p = db.products.find((x) => x.id === id); return p && `${p.name} (${p.sku})` }
    case 'category': return db.categories.find((x) => x.id === id)?.name
    case 'unit': { const u = db.units.find((x) => x.id === id); return u && `${u.name} (${u.code})` }
    case 'supplier': return db.suppliers.find((x) => x.id === id)?.name
    case 'warehouse': { const w = db.warehouses.find((x) => x.id === id); return w && `${w.name} (${w.code})` }
    case 'user': { const u = db.users.find((x) => x.id === id); return u && `${u.username} · ${u.role.name}` }
    case 'role': { const r = db.roles.find((x) => x.id === id); return r && `${r.name} · ${r.permissions.join(', ')}` }
    default: return undefined
  }
}

/** Audita automáticamente las altas, cambios y bajas de los CRUD (como hacen los servicios del backend). */
async function autoAudit(request: Request, params: PathParams, response: Response, user: DemoUser, before?: string) {
  if (request.method === 'GET' || !response.ok) return
  const segments = new URL(request.url).pathname.split('/')
  const resourceIndex = segments.findIndex((s) => s in RESOURCE_TYPES)
  if (resourceIndex < 0) return
  const type = RESOURCE_TYPES[segments[resourceIndex]]
  const isImage = segments.includes('image')
  let id = params.id ? Number(params.id) : undefined
  if (id === undefined) {
    try { id = ((await response.clone().json()) as { id?: number }).id } catch { /* sin cuerpo */ }
  }
  if (id === undefined) return
  const action: AuditAction = isImage ? 'UPDATE' : request.method === 'POST' ? 'CREATE' : request.method === 'PUT' ? 'UPDATE' : 'DELETE'
  const summary = action === 'DELETE' ? before : describe(type, id)
  log(user.username, action, type, id, isImage && summary ? `${summary} · ${request.method === 'DELETE' ? 'image removed' : 'image'}` : summary)
}

type Handler = (args: { request: Request; params: PathParams; user: DemoUser }) => Promise<Response> | Response

/** Envuelve un handler: exige sesión, verifica permiso y traduce HttpError a ProblemDetail. */
function guarded(permission: PermissionValue | PermissionValue[] | null, handler: Handler) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    const user = sessionUser()
    if (!user) return problem(401, 'Sesión no iniciada')
    const required = permission === null ? [] : Array.isArray(permission) ? permission : [permission]
    if (required.length > 0 && !required.some((p) => permissionsOf(user).includes(p))) {
      return problem(403, 'No tienes permiso para esta operación')
    }
    try {
      const segments = new URL(request.url).pathname.split('/')
      const resource = segments.find((s) => s in RESOURCE_TYPES)
      const before = request.method === 'DELETE' && resource && params.id ? describe(RESOURCE_TYPES[resource], Number(params.id)) : undefined
      const response = await handler({ request, params, user })
      await autoAudit(request, params, response, user, before)
      persist()
      return response
    } catch (e) {
      if (e instanceof HttpError) return problem(e.status, e.detail, e.errors)
      throw e
    }
  }
}

function idParam(params: PathParams): number {
  return Number(params.id)
}

function touch<T extends { audit: AuditInfo }>(entity: T, by: string): T {
  entity.audit = { ...entity.audit, updatedAt: new Date().toISOString(), updatedBy: by }
  return entity
}

function blank(v: string | null | undefined): string | undefined {
  return v && v.trim() ? v.trim() : undefined
}

function requireFields(fields: Record<string, string | false>) {
  const errors = Object.fromEntries(Object.entries(fields).filter(([, msg]) => msg)) as Record<string, string>
  if (Object.keys(errors).length > 0) fail(400, 'Datos inválidos', errors)
}

const SORT_GETTERS: Record<string, (x: never) => unknown> = {
  updatedAt: (x: { audit: { updatedAt: string } }) => x.audit.updatedAt,
  createdAt: (x: { audit?: { createdAt: string }; createdAt?: string }) => x.createdAt ?? x.audit?.createdAt,
  occurredAt: (x: { occurredAt: string }) => x.occurredAt,
}

function paginate<T>(items: T[], request: Request, defaultSort: string) {
  const params = new URL(request.url).searchParams
  const page = Math.max(0, Number(params.get('page') ?? 0))
  const size = Math.min(100, Math.max(1, Number(params.get('size') ?? 20)))
  const [field, dir = 'asc'] = (params.get('sort') ?? defaultSort).split(',')
  if (field === 'none') {
    const totalElements = items.length
    return HttpResponse.json({ content: items.slice(page * size, page * size + size), page, size, totalElements,
      totalPages: Math.ceil(totalElements / size) })
  }
  const getter = SORT_GETTERS[field] ?? ((x: Record<string, unknown>) => x[field])
  const sorted = [...items].sort((a, b) => {
    const va = getter(a as never) as string | number
    const vb = getter(b as never) as string | number
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''))
    return dir === 'desc' ? -cmp : cmp
  })
  const totalElements = sorted.length
  return HttpResponse.json({
    content: sorted.slice(page * size, page * size + size),
    page, size, totalElements, totalPages: Math.ceil(totalElements / size),
  })
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${file.type};base64,${btoa(binary)}`
}

// ---------- validaciones de dominio ----------

function validateProduct(body: ProductRequest) {
  requireFields({
    sku: (!body.sku?.trim() && 'no debe estar vacío') || (!/^[A-Za-z0-9._-]+$/.test(body.sku.trim()) && 'formato inválido'),
    name: !body.name?.trim() && 'no debe estar vacío',
    unitId: !body.unitId && 'no debe ser nulo',
    costPrice: (body.costPrice == null || body.costPrice < 0) && 'debe ser mayor o igual que 0',
    salePrice: (body.salePrice == null || body.salePrice < 0) && 'debe ser mayor o igual que 0',
    status: !['ACTIVE', 'INACTIVE'].includes(body.status) && 'valor inválido',
  })
}

function buildProduct(body: ProductRequest, existing: Product | undefined, by: string): Product {
  const db = getDb()
  const category = body.categoryId ? db.categories.find((c) => c.id === body.categoryId) ?? fail(400, ['La categoría {{v0}} no existe', { v0: body.categoryId }]) : undefined
  const unit = db.units.find((u) => u.id === body.unitId) ?? fail(400, ['La unidad {{v0}} no existe', { v0: body.unitId }])
  const supplier = body.supplierId ? db.suppliers.find((s) => s.id === body.supplierId) ?? fail(400, ['El proveedor {{v0}} no existe', { v0: body.supplierId }]) : undefined
  return {
    id: existing?.id ?? nextId(),
    sku: body.sku.trim(),
    name: body.name.trim(),
    description: blank(body.description),
    category: category && { id: category.id, name: category.name },
    unit,
    supplier: supplier && { id: supplier.id, name: supplier.name },
    costPrice: body.costPrice,
    salePrice: body.salePrice,
    minStock: body.minStock ?? 0,
    status: body.status,
    imageUrl: existing?.imageUrl,
    audit: existing ? existing.audit : audit(by),
  }
}

function buildSupplier(body: SupplierRequest, existing: Supplier | undefined, by: string): Supplier {
  requireFields({
    name: !body.name?.trim() && 'no debe estar vacío',
    email: !!body.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) && 'debe ser una dirección de correo electrónico con formato correcto',
  })
  return {
    id: existing?.id ?? nextId(),
    name: body.name.trim(),
    taxId: blank(body.taxId), email: blank(body.email), phone: blank(body.phone),
    address: blank(body.address), notes: blank(body.notes),
    active: body.active ?? true,
    audit: existing ? existing.audit : audit(by),
  }
}

// ---------- handlers ----------

const baseHandlers = [
  // Meta y autenticación
  http.get(url('/meta'), () => HttpResponse.json({ currency: 'USD' })),

  http.post(url('/auth/login'), async ({ request }) => {
    const { username, password } = (await request.json()) as { username?: string; password?: string }
    const user = getDb().users.find((u) => u.username === username)
    if (!user || !user.enabled || user.password !== password) {
      log(username ?? '', 'LOGIN_FAILED', 'user', undefined, username)
      persist()
      return problem(401, 'Usuario o contraseña incorrectos')
    }
    sessionStorage.setItem(SESSION_KEY, user.username)
    log(user.username, 'LOGIN', 'user', user.id, user.username)
    persist()
    return HttpResponse.json(toMe(user))
  }),

  http.post(url('/auth/refresh'), () => {
    const user = sessionUser()
    return user ? HttpResponse.json(toMe(user)) : new HttpResponse(null, { status: 401 })
  }),

  http.post(url('/auth/logout'), () => {
    const user = sessionUser()
    if (user) {
      log(user.username, 'LOGOUT', 'user', user.id, user.username)
      persist()
    }
    sessionStorage.removeItem(SESSION_KEY)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(url('/auth/me'), guarded(null, ({ user }) => HttpResponse.json(toMe(user)))),

  // Productos
  http.get(url('/products'), guarded('catalog:read', ({ request }) => {
    const params = new URL(request.url).searchParams
    const q = params.get('q')?.trim().toLowerCase()
    const categoryId = params.get('categoryId')
    const supplierId = params.get('supplierId')
    const status = params.get('status')
    const items = getDb().products.filter((p) =>
      (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
      (!categoryId || p.category?.id === Number(categoryId)) &&
      (!supplierId || p.supplier?.id === Number(supplierId)) &&
      (!status || p.status === status))
    return paginate(items, request, 'name,asc')
  })),

  http.get(url('/products/:id'), guarded('catalog:read', ({ params }) => {
    const product = getDb().products.find((p) => p.id === idParam(params))
    return product ? HttpResponse.json(product) : problem(404, ['Producto {{v0}} no existe', { v0: params.id }])
  })),

  http.post(url('/products'), guarded('catalog:write', async ({ request, user }) => {
    const body = (await request.json()) as ProductRequest
    validateProduct(body)
    const db = getDb()
    if (db.products.some((p) => p.sku.toLowerCase() === body.sku.trim().toLowerCase())) {
      fail(409, ['Ya existe un producto con el SKU {{v0}}', { v0: body.sku.trim() }])
    }
    const product = buildProduct(body, undefined, user.username)
    db.products.push(product)
    return HttpResponse.json(product, { status: 201 })
  })),

  http.put(url('/products/:id'), guarded('catalog:write', async ({ request, params, user }) => {
    const db = getDb()
    const index = db.products.findIndex((p) => p.id === idParam(params))
    if (index < 0) fail(404, ['Producto {{v0}} no existe', { v0: params.id }])
    const body = (await request.json()) as ProductRequest
    validateProduct(body)
    if (db.products.some((p) => p.id !== idParam(params) && p.sku.toLowerCase() === body.sku.trim().toLowerCase())) {
      fail(409, ['Ya existe un producto con el SKU {{v0}}', { v0: body.sku.trim() }])
    }
    db.products[index] = touch(buildProduct(body, db.products[index], user.username), user.username)
    return HttpResponse.json(db.products[index])
  })),

  http.delete(url('/products/:id'), guarded('catalog:write', ({ params }) => {
    const db = getDb()
    if (!db.products.some((p) => p.id === idParam(params))) fail(404, ['Producto {{v0}} no existe', { v0: params.id }])
    if (db.movements.some((m) => m.product.id === idParam(params))) {
      fail(409, 'El producto tiene movimientos de stock; desactívalo en lugar de eliminarlo')
    }
    db.products = db.products.filter((p) => p.id !== idParam(params))
    return new HttpResponse(null, { status: 204 })
  })),

  http.post(url('/products/:id/image'), guarded('catalog:write', async ({ request, params, user }) => {
    const product = getDb().products.find((p) => p.id === idParam(params)) ?? fail(404, ['Producto {{v0}} no existe', { v0: params.id }])
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size === 0) fail(400, 'El archivo está vacío')
    const image = file as File
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(image.type)) fail(400, 'Formato no soportado. Usa PNG, JPG, WEBP o GIF')
    if (image.size > 5 * 1024 * 1024) fail(400, 'La imagen supera los 5 MB')
    product.imageUrl = await fileToDataUrl(image)
    return HttpResponse.json(touch(product, user.username))
  })),

  http.delete(url('/products/:id/image'), guarded('catalog:write', ({ params, user }) => {
    const product = getDb().products.find((p) => p.id === idParam(params)) ?? fail(404, ['Producto {{v0}} no existe', { v0: params.id }])
    product.imageUrl = undefined
    return HttpResponse.json(touch(product, user.username))
  })),

  // Categorías
  http.get(url('/categories'), guarded('catalog:read', () =>
    HttpResponse.json([...getDb().categories].sort((a, b) => a.name.localeCompare(b.name))))),

  http.post(url('/categories'), guarded('catalog:write', async ({ request, user }) => {
    const body = (await request.json()) as CategoryRequest
    requireFields({ name: !body.name?.trim() && 'no debe estar vacío' })
    const db = getDb()
    if (db.categories.some((c) => c.name.toLowerCase() === body.name.trim().toLowerCase())) fail(409, 'Ya existe una categoría con ese nombre')
    const category = { id: nextId(), name: body.name.trim(), description: blank(body.description), audit: audit(user.username) }
    db.categories.push(category)
    return HttpResponse.json(category, { status: 201 })
  })),

  http.put(url('/categories/:id'), guarded('catalog:write', async ({ request, params, user }) => {
    const db = getDb()
    const category = db.categories.find((c) => c.id === idParam(params)) ?? fail(404, ['Categoría {{v0}} no existe', { v0: params.id }])
    const body = (await request.json()) as CategoryRequest
    requireFields({ name: !body.name?.trim() && 'no debe estar vacío' })
    if (db.categories.some((c) => c.id !== category.id && c.name.toLowerCase() === body.name.trim().toLowerCase())) fail(409, 'Ya existe una categoría con ese nombre')
    category.name = body.name.trim()
    category.description = blank(body.description)
    for (const p of db.products) if (p.category?.id === category.id) p.category = { id: category.id, name: category.name }
    return HttpResponse.json(touch(category, user.username))
  })),

  http.delete(url('/categories/:id'), guarded('catalog:write', ({ params }) => {
    const db = getDb()
    if (!db.categories.some((c) => c.id === idParam(params))) fail(404, ['Categoría {{v0}} no existe', { v0: params.id }])
    if (db.products.some((p) => p.category?.id === idParam(params))) fail(409, 'La categoría tiene productos asociados')
    db.categories = db.categories.filter((c) => c.id !== idParam(params))
    return new HttpResponse(null, { status: 204 })
  })),

  // Unidades
  http.get(url('/units'), guarded('catalog:read', () =>
    HttpResponse.json([...getDb().units].sort((a, b) => a.name.localeCompare(b.name))))),

  http.post(url('/units'), guarded('catalog:write', async ({ request }) => {
    const body = (await request.json()) as UnitRequest
    requireFields({ code: !body.code?.trim() && 'no debe estar vacío', name: !body.name?.trim() && 'no debe estar vacío' })
    const db = getDb()
    if (db.units.some((u) => u.code.toLowerCase() === body.code.trim().toLowerCase())) fail(409, 'Ya existe una unidad con ese código')
    const unit = { id: nextId(), code: body.code.trim(), name: body.name.trim(), decimals: body.decimals }
    db.units.push(unit)
    return HttpResponse.json(unit, { status: 201 })
  })),

  http.put(url('/units/:id'), guarded('catalog:write', async ({ request, params }) => {
    const db = getDb()
    const unit = db.units.find((u) => u.id === idParam(params)) ?? fail(404, ['Unidad {{v0}} no existe', { v0: params.id }])
    const body = (await request.json()) as UnitRequest
    if (db.units.some((u) => u.id !== unit.id && u.code.toLowerCase() === body.code.trim().toLowerCase())) fail(409, 'Ya existe una unidad con ese código')
    Object.assign(unit, { code: body.code.trim(), name: body.name.trim(), decimals: body.decimals })
    for (const p of db.products) if (p.unit.id === unit.id) p.unit = { ...unit }
    return HttpResponse.json(unit)
  })),

  http.delete(url('/units/:id'), guarded('catalog:write', ({ params }) => {
    const db = getDb()
    if (!db.units.some((u) => u.id === idParam(params))) fail(404, ['Unidad {{v0}} no existe', { v0: params.id }])
    if (db.products.some((p) => p.unit.id === idParam(params))) fail(409, 'La unidad está en uso')
    db.units = db.units.filter((u) => u.id !== idParam(params))
    return new HttpResponse(null, { status: 204 })
  })),

  // Proveedores
  http.get(url('/suppliers'), guarded('partners:read', ({ request }) => {
    const params = new URL(request.url).searchParams
    const q = params.get('q')?.trim().toLowerCase()
    const active = params.get('active')
    const items = getDb().suppliers.filter((s) =>
      (!q || s.name.toLowerCase().includes(q) || (s.taxId ?? '').toLowerCase().includes(q)) &&
      (active === null || String(s.active) === active))
    return paginate(items, request, 'name,asc')
  })),

  http.post(url('/suppliers'), guarded('partners:write', async ({ request, user }) => {
    const supplier = buildSupplier((await request.json()) as SupplierRequest, undefined, user.username)
    getDb().suppliers.push(supplier)
    return HttpResponse.json(supplier, { status: 201 })
  })),

  http.put(url('/suppliers/:id'), guarded('partners:write', async ({ request, params, user }) => {
    const db = getDb()
    const index = db.suppliers.findIndex((s) => s.id === idParam(params))
    if (index < 0) fail(404, ['Proveedor {{v0}} no existe', { v0: params.id }])
    const supplier = touch(buildSupplier((await request.json()) as SupplierRequest, db.suppliers[index], user.username), user.username)
    db.suppliers[index] = supplier
    for (const p of db.products) if (p.supplier?.id === supplier.id) p.supplier = { id: supplier.id, name: supplier.name }
    return HttpResponse.json(supplier)
  })),

  http.delete(url('/suppliers/:id'), guarded('partners:write', ({ params }) => {
    const db = getDb()
    if (!db.suppliers.some((s) => s.id === idParam(params))) fail(404, ['Proveedor {{v0}} no existe', { v0: params.id }])
    if (db.products.some((p) => p.supplier?.id === idParam(params))) {
      fail(409, 'El proveedor tiene productos asociados; desactívalo en lugar de eliminarlo')
    }
    db.suppliers = db.suppliers.filter((s) => s.id !== idParam(params))
    return new HttpResponse(null, { status: 204 })
  })),

  // Usuarios
  http.get(url('/users'), guarded('users:read', ({ request }) =>
    paginate(getDb().users.map(publicUser), request, 'username,asc'))),

  http.post(url('/users'), guarded('users:write', async ({ request, user }) => {
    const body = (await request.json()) as CreateUserRequest
    requireFields({
      username: (!body.username || body.username.length < 3) && 'el tamaño debe estar entre 3 y 50',
      displayName: !body.displayName?.trim() && 'no debe estar vacío',
      password: (!body.password || body.password.length < 8) && 'el tamaño debe estar entre 8 y 72',
    })
    const db = getDb()
    if (db.users.some((u) => u.username.toLowerCase() === body.username.toLowerCase())) fail(409, 'Ya existe un usuario con ese nombre')
    const role = db.roles.find((r) => r.id === body.roleId) ?? fail(400, ['El rol {{v0}} no existe', { v0: body.roleId }])
    const created: DemoUser = {
      id: nextId(), username: body.username, password: body.password, displayName: body.displayName.trim(),
      email: blank(body.email), role: { id: role.id, name: role.name }, enabled: body.enabled ?? true, audit: audit(user.username),
    }
    db.users.push(created)
    return HttpResponse.json(publicUser(created), { status: 201 })
  })),

  http.put(url('/users/:id'), guarded('users:write', async ({ request, params, user }) => {
    const db = getDb()
    const target = db.users.find((u) => u.id === idParam(params)) ?? fail(404, ['Usuario {{v0}} no existe', { v0: params.id }])
    const body = (await request.json()) as UpdateUserRequest
    const role = db.roles.find((r) => r.id === body.roleId) ?? fail(400, ['El rol {{v0}} no existe', { v0: body.roleId }])
    if (target.id === user.id && (!body.enabled || role.id !== target.role.id)) fail(400, 'No puedes desactivarte ni cambiar tu propio rol')
    Object.assign(target, { displayName: body.displayName.trim(), email: blank(body.email), role: { id: role.id, name: role.name }, enabled: body.enabled })
    if (body.password) target.password = body.password
    return HttpResponse.json(publicUser(touch(target, user.username)))
  })),

  http.delete(url('/users/:id'), guarded('users:write', ({ params, user }) => {
    const db = getDb()
    if (!db.users.some((u) => u.id === idParam(params))) fail(404, ['Usuario {{v0}} no existe', { v0: params.id }])
    if (idParam(params) === user.id) fail(400, 'No puedes eliminar tu propio usuario')
    db.users = db.users.filter((u) => u.id !== idParam(params))
    return new HttpResponse(null, { status: 204 })
  })),

  // Roles y permisos
  http.get(url('/roles'), guarded(['roles:read', 'users:read'], () =>
    HttpResponse.json([...getDb().roles].sort((a, b) => a.name.localeCompare(b.name))))),

  http.get(url('/permissions'), guarded('roles:read', () =>
    HttpResponse.json(ALL_PERMISSIONS.map((value): PermissionInfo => ({ value, resource: value.split(':')[0] }))))),

  http.post(url('/roles'), guarded('roles:write', async ({ request, user }) => {
    const body = (await request.json()) as RoleRequest
    validateRole(body)
    const db = getDb()
    if (db.roles.some((r) => r.name.toLowerCase() === body.name.toLowerCase())) fail(409, 'Ya existe un rol con ese nombre')
    const role: Role = { id: nextId(), name: body.name, description: blank(body.description), system: false,
      permissions: [...body.permissions].sort(), audit: audit(user.username) }
    db.roles.push(role)
    return HttpResponse.json(role, { status: 201 })
  })),

  http.put(url('/roles/:id'), guarded('roles:write', async ({ request, params, user }) => {
    const db = getDb()
    const role = db.roles.find((r) => r.id === idParam(params)) ?? fail(404, ['Rol {{v0}} no existe', { v0: params.id }])
    if (role.system) fail(400, 'Los roles de sistema no se pueden modificar')
    const body = (await request.json()) as RoleRequest
    validateRole(body)
    if (db.roles.some((r) => r.id !== role.id && r.name.toLowerCase() === body.name.toLowerCase())) fail(409, 'Ya existe un rol con ese nombre')
    Object.assign(role, { name: body.name, description: blank(body.description), permissions: [...body.permissions].sort() })
    for (const u of db.users) if (u.role.id === role.id) u.role = { id: role.id, name: role.name }
    return HttpResponse.json(touch(role, user.username))
  })),

  http.delete(url('/roles/:id'), guarded('roles:write', ({ params }) => {
    const db = getDb()
    const role = db.roles.find((r) => r.id === idParam(params)) ?? fail(404, ['Rol {{v0}} no existe', { v0: params.id }])
    if (role.system) fail(400, 'Los roles de sistema no se pueden eliminar')
    if (db.users.some((u) => u.role.id === role.id)) fail(409, 'El rol tiene usuarios asignados')
    db.roles = db.roles.filter((r) => r.id !== role.id)
    return new HttpResponse(null, { status: 204 })
  })),
]

// ---------- inventario ----------

function stockOf(productId: number, warehouseId: number) {
  const db = getDb()
  let row = db.stock.find((r) => r.productId === productId && r.warehouseId === warehouseId)
  if (!row) {
    row = { productId, warehouseId, quantity: 0 }
    db.stock.push(row)
  }
  return row
}

const round3 = (n: number) => Math.round(n * 1000) / 1000

function activeWarehouse(id: number | null | undefined): Warehouse {
  const w = getDb().warehouses.find((x) => x.id === id) ?? fail(400, ['El almacén {{v0}} no existe', { v0: id }])
  if (!w.active) fail(400, ['El almacén {{v0}} está inactivo', { v0: w.name }])
  return w
}

function applyMovement(type: MovementType, product: Product, warehouse: Warehouse, delta: number,
  body: MovementRequest, by: string, group?: string): Movement {
  const row = stockOf(product.id, warehouse.id)
  if (round3(row.quantity + delta) < 0) {
    fail(409, ['Stock insuficiente en {{v0}}: disponible {{v1}} {{v2}}', { v0: warehouse.name, v1: row.quantity, v2: product.unit.code }])
  }
  row.quantity = round3(row.quantity + delta)
  const movement: Movement = {
    id: nextId(), type, quantity: round3(delta), balanceAfter: row.quantity,
    reason: blank(body.reason), reference: blank(body.reference), transferGroup: group,
    product: { id: product.id, sku: product.sku, name: product.name, unitCode: product.unit.code, unitDecimals: product.unit.decimals },
    warehouse: { id: warehouse.id, code: warehouse.code, name: warehouse.name },
    createdAt: new Date().toISOString(), createdBy: by,
  }
  getDb().movements.push(movement)
  return movement
}

function registerMovement(body: MovementRequest, by: string): Movement[] {
  const db = getDb()
  const product = db.products.find((p) => p.id === body.productId) ?? fail(400, ['El producto {{v0}} no existe', { v0: body.productId }])
  const source = activeWarehouse(body.warehouseId)
  const qty = Number(body.quantity)
  if (!Number.isFinite(qty) || qty < 0) fail(400, 'Datos inválidos', { quantity: 'debe ser mayor o igual que 0' })
  const factor = 10 ** product.unit.decimals
  if (Math.abs(qty * factor - Math.round(qty * factor)) > 1e-9) {
    fail(400, product.unit.decimals === 0 ? ['La unidad {{unit}} no admite decimales', { unit: product.unit.name }]
      : ['La unidad {{unit}} admite hasta {{count}} decimales', { unit: product.unit.name, count: product.unit.decimals }])
  }
  const positive = () => { if (qty <= 0) fail(400, 'La cantidad debe ser mayor que cero') }
  switch (body.type) {
    case 'IN':
      positive()
      return [applyMovement('IN', product, source, qty, body, by)]
    case 'OUT':
      positive()
      return [applyMovement('OUT', product, source, -qty, body, by)]
    case 'ADJUSTMENT': {
      if (!blank(body.reason)) fail(400, 'Indica el motivo del ajuste')
      const delta = round3(qty - stockOf(product.id, source.id).quantity)
      if (delta === 0) fail(400, 'El saldo contado coincide con el registrado; no hay nada que ajustar')
      return [applyMovement('ADJUSTMENT', product, source, delta, body, by)]
    }
    case 'TRANSFER': {
      positive()
      if (!body.targetWarehouseId) fail(400, 'Indica el almacén de destino')
      if (body.targetWarehouseId === source.id) fail(400, 'El almacén de destino debe ser distinto del de origen')
      const target = activeWarehouse(body.targetWarehouseId)
      const group = crypto.randomUUID()
      return [
        applyMovement('TRANSFER_OUT', product, source, -qty, body, by, group),
        applyMovement('TRANSFER_IN', product, target, qty, body, by, group),
      ]
    }
    default:
      return fail(400, 'Datos inválidos', { type: 'valor inválido' })
  }
}

function productStock(product: Product): ProductStock {
  const db = getDb()
  const levels = db.stock
    .filter((r) => r.productId === product.id)
    .map((r) => {
      const w = db.warehouses.find((x) => x.id === r.warehouseId)!
      return { warehouse: { id: w.id, code: w.code, name: w.name }, quantity: r.quantity }
    })
    .sort((x, y) => x.warehouse.name.localeCompare(y.warehouse.name))
  const total = round3(levels.reduce((sum, l) => sum + l.quantity, 0))
  return {
    product: { id: product.id, sku: product.sku, name: product.name, unitCode: product.unit.code, unitDecimals: product.unit.decimals },
    minStock: product.minStock, total, low: product.minStock > 0 && total < product.minStock, levels,
  }
}

export const inventoryHandlers = [
  http.get(url('/warehouses'), guarded('inventory:read', () =>
    HttpResponse.json([...getDb().warehouses].sort((a, b) => a.name.localeCompare(b.name))))),

  http.post(url('/warehouses'), guarded('inventory:write', async ({ request, user }) => {
    const body = (await request.json()) as WarehouseRequest
    requireFields({ code: !body.code?.trim() && 'no debe estar vacío', name: !body.name?.trim() && 'no debe estar vacío' })
    const db = getDb()
    const code = body.code.trim().toUpperCase()
    if (db.warehouses.some((w) => w.code === code)) fail(409, ['Ya existe un almacén con el código {{v0}}', { v0: code }])
    const warehouse: Warehouse = { id: nextId(), code, name: body.name.trim(), address: blank(body.address),
      active: body.active ?? true, audit: audit(user.username) }
    db.warehouses.push(warehouse)
    return HttpResponse.json(warehouse, { status: 201 })
  })),

  http.put(url('/warehouses/:id'), guarded('inventory:write', async ({ request, params, user }) => {
    const db = getDb()
    const warehouse = db.warehouses.find((w) => w.id === idParam(params)) ?? fail(404, ['Almacén {{v0}} no existe', { v0: params.id }])
    const body = (await request.json()) as WarehouseRequest
    const code = body.code.trim().toUpperCase()
    if (db.warehouses.some((w) => w.id !== warehouse.id && w.code === code)) fail(409, ['Ya existe un almacén con el código {{v0}}', { v0: code }])
    Object.assign(warehouse, { code, name: body.name.trim(), address: blank(body.address), active: body.active ?? true })
    for (const m of db.movements) if (m.warehouse.id === warehouse.id) m.warehouse = { id: warehouse.id, code, name: warehouse.name }
    return HttpResponse.json(touch(warehouse, user.username))
  })),

  http.delete(url('/warehouses/:id'), guarded('inventory:write', ({ params }) => {
    const db = getDb()
    if (!db.warehouses.some((w) => w.id === idParam(params))) fail(404, ['Almacén {{v0}} no existe', { v0: params.id }])
    if (db.movements.some((m) => m.warehouse.id === idParam(params))) {
      fail(409, 'El almacén tiene movimientos registrados; desactívalo en lugar de eliminarlo')
    }
    db.warehouses = db.warehouses.filter((w) => w.id !== idParam(params))
    return new HttpResponse(null, { status: 204 })
  })),

  http.get(url('/inventory/stock'), guarded('inventory:read', ({ request }) => {
    const params = new URL(request.url).searchParams
    const q = params.get('q')?.trim().toLowerCase()
    const categoryId = params.get('categoryId')
    const lowOnly = params.get('lowOnly') === 'true'
    const rows = getDb().products
      .filter((p) => p.status === 'ACTIVE' &&
        (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) &&
        (!categoryId || p.category?.id === Number(categoryId)))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(productStock)
      .filter((r) => !lowOnly || r.low)
    return paginate(rows, request, 'none')
  })),

  http.get(url('/inventory/movements'), guarded('inventory:read', ({ request }) => {
    const params = new URL(request.url).searchParams
    const productId = params.get('productId')
    const warehouseId = params.get('warehouseId')
    const type = params.get('type')
    const rows = getDb().movements.filter((m) =>
      (!productId || m.product.id === Number(productId)) &&
      (!warehouseId || m.warehouse.id === Number(warehouseId)) &&
      (!type || m.type === type))
    return paginate(rows, request, 'createdAt,desc')
  })),

  http.post(url('/inventory/movements'), guarded('inventory:write', async ({ request, user }) => {
    const body = (await request.json()) as MovementRequest
    const result = registerMovement(body, user.username)
    const first = result[0]
    const transfer = result.length > 1
    const qty = transfer ? -first.quantity : first.quantity
    const where = transfer ? `${first.warehouse.name} → ${result[1].warehouse.name}` : first.warehouse.name
    log(user.username, 'STOCK_MOVEMENT', 'product', first.product.id,
      `${transfer ? 'TRANSFER' : first.type} · ${qty} ${first.product.unitCode} · ${first.product.name} (${first.product.sku}) · ${where}`)
    return HttpResponse.json(result, { status: 201 })
  })),

  // Auditoría
  http.get(url('/audit'), guarded('audit:read', ({ request }) => {
    const p = new URL(request.url).searchParams
    const q = p.get('q')?.trim().toLowerCase()
    const actor = p.get('actor')?.trim().toLowerCase()
    const from = p.get('from') ? Date.parse(p.get('from')!) : undefined
    const to = p.get('to') ? Date.parse(p.get('to')!) : undefined
    const rows = getDb().audit.filter((e) =>
      (!actor || e.actor?.toLowerCase() === actor) &&
      (!p.get('action') || e.action === p.get('action')) &&
      (!p.get('entityType') || e.entityType === p.get('entityType')) &&
      (!p.get('entityId') || e.entityId === p.get('entityId')) &&
      (!q || (e.summary ?? '').toLowerCase().includes(q)) &&
      (from === undefined || Date.parse(e.occurredAt) >= from) &&
      (to === undefined || Date.parse(e.occurredAt) < to))
    return paginate(rows, request, 'occurredAt,desc')
  })),

  // Reportes
  http.get(url('/reports/valuation'), guarded('inventory:read', ({ request }) => {
    const db = getDb()
    const byWarehouse = new URL(request.url).searchParams.get('groupBy') === 'WAREHOUSE'
    const groups = new Map<string, ValuationRow & { productIds: Set<number> }>()
    for (const row of db.stock) {
      if (row.quantity <= 0) continue
      const product = db.products.find((p) => p.id === row.productId)
      if (!product) continue
      const key = byWarehouse ? { id: row.warehouseId, name: db.warehouses.find((w) => w.id === row.warehouseId)?.name ?? null }
        : { id: product.category?.id ?? null, name: product.category?.name ?? null }
      const g = groups.get(String(key.id)) ?? { ...key, products: 0, costValue: 0, saleValue: 0, productIds: new Set<number>() }
      g.productIds.add(product.id)
      g.costValue += row.quantity * product.costPrice
      g.saleValue += row.quantity * product.salePrice
      groups.set(String(key.id), g)
    }
    const money = (n: number) => Math.round(n * 100) / 100
    return HttpResponse.json([...groups.values()]
      .map(({ productIds, ...g }) => ({ ...g, products: productIds.size, costValue: money(g.costValue), saleValue: money(g.saleValue) }))
      .sort((a, b) => b.costValue - a.costValue))
  })),

  http.get(url('/reports/activity'), guarded('inventory:read', ({ request }) => {
    const p = new URL(request.url).searchParams
    const days = Math.min(366, Math.max(1, Number(p.get('days') ?? 30)))
    const tz = p.get('tz') || 'UTC'
    try { new Intl.DateTimeFormat('en-CA', { timeZone: tz }) } catch { return problem(400, ['Zona horaria inválida: {{v0}}', { v0: tz }]) }
    const localDate = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
    const series: ActivityDay[] = []
    for (let i = days - 1; i >= 0; i--) {
      series.push({ date: localDate(new Date(Date.now() - i * 86_400_000)), inValue: 0, outValue: 0, adjustmentValue: 0, movements: 0 })
    }
    const byDate = new Map(series.map((d) => [d.date, d]))
    const db = getDb()
    for (const m of db.movements) {
      const day = byDate.get(localDate(new Date(m.createdAt)))
      if (!day) continue
      const cost = db.products.find((x) => x.id === m.product.id)?.costPrice ?? 0
      day.movements++
      if (m.type === 'IN') day.inValue += m.quantity * cost
      if (m.type === 'OUT') day.outValue += -m.quantity * cost
      if (m.type === 'ADJUSTMENT') day.adjustmentValue += m.quantity * cost
    }
    return HttpResponse.json(series.map((d) => ({ ...d, inValue: Math.round(d.inValue * 100) / 100,
      outValue: Math.round(d.outValue * 100) / 100, adjustmentValue: Math.round(d.adjustmentValue * 100) / 100 })))
  })),

  http.get(url('/reports/top-products'), guarded('inventory:read', ({ request }) => {
    const p = new URL(request.url).searchParams
    const since = Date.now() - Math.min(366, Math.max(1, Number(p.get('days') ?? 30))) * 86_400_000
    const limit = Math.min(50, Math.max(1, Number(p.get('limit') ?? 10)))
    const db = getDb()
    const rows = new Map<number, TopProduct>()
    for (const m of db.movements) {
      if (m.type !== 'OUT' || Date.parse(m.createdAt) < since) continue
      const cost = db.products.find((x) => x.id === m.product.id)?.costPrice ?? 0
      const row = rows.get(m.product.id) ?? { product: m.product, outQuantity: 0, outValue: 0, movements: 0 }
      row.outQuantity += -m.quantity
      row.outValue += -m.quantity * cost
      row.movements++
      rows.set(m.product.id, row)
    }
    return HttpResponse.json([...rows.values()]
      .map((r) => ({ ...r, outQuantity: Math.round(r.outQuantity * 1000) / 1000, outValue: Math.round(r.outValue * 100) / 100 }))
      .sort((a, b) => b.outValue - a.outValue || a.product.name.localeCompare(b.product.name))
      .slice(0, limit))
  })),

  http.get(url('/inventory/summary'), guarded('inventory:read', () => {
    const db = getDb()
    const weekAgo = Date.now() - 7 * 24 * 3_600_000
    const summary: InventorySummary = {
      inventoryValue: Math.round(db.stock.reduce((sum, r) =>
        sum + r.quantity * (db.products.find((p) => p.id === r.productId)?.costPrice ?? 0), 0) * 100) / 100,
      lowStockProducts: db.products.filter((p) => p.status === 'ACTIVE' && productStock(p).low).length,
      movementsLast7Days: db.movements.filter((m) => Date.parse(m.createdAt) >= weekAgo).length,
      activeWarehouses: db.warehouses.filter((w) => w.active).length,
    }
    return HttpResponse.json(summary)
  })),
]

function validateRole(body: RoleRequest) {
  requireFields({ name: (!body.name || !/^[A-Z0-9_]+$/.test(body.name)) && 'mayúsculas, números y guion bajo' })
  const unknown = body.permissions.filter((p) => !ALL_PERMISSIONS.includes(p))
  if (unknown.length > 0) fail(400, ['Permisos desconocidos: {{v0}}', { v0: unknown.join(', ') }])
}

export const handlers = [...baseHandlers, ...inventoryHandlers]
