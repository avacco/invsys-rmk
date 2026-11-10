import { http, HttpResponse, type PathParams } from 'msw'
import { API_BASE } from '@/api/client'
import type {
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

function problem(status: number, detail: string, errors?: Record<string, string>) {
  return HttpResponse.json({ status, title: detail, detail, ...(errors ? { errors } : {}) }, { status })
}

class HttpError extends Error {
  constructor(readonly status: number, message: string, readonly errors?: Record<string, string>) {
    super(message)
  }
}

const fail = (status: number, message: string, errors?: Record<string, string>): never => {
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

type Handler = (args: { request: Request; params: PathParams; user: DemoUser }) => Promise<Response> | Response

/** Envuelve un handler: exige sesión, verifica permiso y traduce HttpError a ProblemDetail. */
function guarded(permission: PermissionValue | PermissionValue[] | null, handler: Handler) {
  return async ({ request, params }: { request: Request; params: PathParams }) => {
    const user = sessionUser()
    if (!user) return problem(401, 'Sesión no iniciada')
    const required = permission === null ? [] : Array.isArray(permission) ? permission : [permission]
    if (required.length > 0 && !required.some((p) => permissionsOf(user).includes(p))) {
      return problem(403, 'No tenés permiso para esta operación')
    }
    try {
      const response = await handler({ request, params, user })
      persist()
      return response
    } catch (e) {
      if (e instanceof HttpError) return problem(e.status, e.message, e.errors)
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
  createdAt: (x: { audit: { createdAt: string } }) => x.audit.createdAt,
}

function paginate<T>(items: T[], request: Request, defaultSort: string) {
  const params = new URL(request.url).searchParams
  const page = Math.max(0, Number(params.get('page') ?? 0))
  const size = Math.min(100, Math.max(1, Number(params.get('size') ?? 20)))
  const [field, dir = 'asc'] = (params.get('sort') ?? defaultSort).split(',')
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
  const category = body.categoryId ? db.categories.find((c) => c.id === body.categoryId) ?? fail(400, `La categoría ${body.categoryId} no existe`) : undefined
  const unit = db.units.find((u) => u.id === body.unitId) ?? fail(400, `La unidad ${body.unitId} no existe`)
  const supplier = body.supplierId ? db.suppliers.find((s) => s.id === body.supplierId) ?? fail(400, `El proveedor ${body.supplierId} no existe`) : undefined
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

export const handlers = [
  // Meta y autenticación
  http.get(url('/meta'), () => HttpResponse.json({ currency: 'USD' })),

  http.post(url('/auth/login'), async ({ request }) => {
    const { username, password } = (await request.json()) as { username?: string; password?: string }
    const user = getDb().users.find((u) => u.username === username)
    if (!user || !user.enabled || user.password !== password) return problem(401, 'Usuario o contraseña incorrectos')
    sessionStorage.setItem(SESSION_KEY, user.username)
    return HttpResponse.json(toMe(user))
  }),

  http.post(url('/auth/refresh'), () => {
    const user = sessionUser()
    return user ? HttpResponse.json(toMe(user)) : new HttpResponse(null, { status: 401 })
  }),

  http.post(url('/auth/logout'), () => {
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
    return product ? HttpResponse.json(product) : problem(404, `Producto ${params.id} no existe`)
  })),

  http.post(url('/products'), guarded('catalog:write', async ({ request, user }) => {
    const body = (await request.json()) as ProductRequest
    validateProduct(body)
    const db = getDb()
    if (db.products.some((p) => p.sku.toLowerCase() === body.sku.trim().toLowerCase())) {
      fail(409, `Ya existe un producto con el SKU ${body.sku.trim()}`)
    }
    const product = buildProduct(body, undefined, user.username)
    db.products.push(product)
    return HttpResponse.json(product, { status: 201 })
  })),

  http.put(url('/products/:id'), guarded('catalog:write', async ({ request, params, user }) => {
    const db = getDb()
    const index = db.products.findIndex((p) => p.id === idParam(params))
    if (index < 0) fail(404, `Producto ${params.id} no existe`)
    const body = (await request.json()) as ProductRequest
    validateProduct(body)
    if (db.products.some((p) => p.id !== idParam(params) && p.sku.toLowerCase() === body.sku.trim().toLowerCase())) {
      fail(409, `Ya existe un producto con el SKU ${body.sku.trim()}`)
    }
    db.products[index] = touch(buildProduct(body, db.products[index], user.username), user.username)
    return HttpResponse.json(db.products[index])
  })),

  http.delete(url('/products/:id'), guarded('catalog:write', ({ params }) => {
    const db = getDb()
    if (!db.products.some((p) => p.id === idParam(params))) fail(404, `Producto ${params.id} no existe`)
    db.products = db.products.filter((p) => p.id !== idParam(params))
    return new HttpResponse(null, { status: 204 })
  })),

  http.post(url('/products/:id/image'), guarded('catalog:write', async ({ request, params, user }) => {
    const product = getDb().products.find((p) => p.id === idParam(params)) ?? fail(404, `Producto ${params.id} no existe`)
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size === 0) fail(400, 'El archivo está vacío')
    const image = file as File
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(image.type)) fail(400, 'Formato no soportado. Usá PNG, JPG, WEBP o GIF')
    if (image.size > 5 * 1024 * 1024) fail(400, 'La imagen supera los 5 MB')
    product.imageUrl = await fileToDataUrl(image)
    return HttpResponse.json(touch(product, user.username))
  })),

  http.delete(url('/products/:id/image'), guarded('catalog:write', ({ params, user }) => {
    const product = getDb().products.find((p) => p.id === idParam(params)) ?? fail(404, `Producto ${params.id} no existe`)
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
    const category = db.categories.find((c) => c.id === idParam(params)) ?? fail(404, `Categoría ${params.id} no existe`)
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
    if (!db.categories.some((c) => c.id === idParam(params))) fail(404, `Categoría ${params.id} no existe`)
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
    const unit = db.units.find((u) => u.id === idParam(params)) ?? fail(404, `Unidad ${params.id} no existe`)
    const body = (await request.json()) as UnitRequest
    if (db.units.some((u) => u.id !== unit.id && u.code.toLowerCase() === body.code.trim().toLowerCase())) fail(409, 'Ya existe una unidad con ese código')
    Object.assign(unit, { code: body.code.trim(), name: body.name.trim(), decimals: body.decimals })
    for (const p of db.products) if (p.unit.id === unit.id) p.unit = { ...unit }
    return HttpResponse.json(unit)
  })),

  http.delete(url('/units/:id'), guarded('catalog:write', ({ params }) => {
    const db = getDb()
    if (!db.units.some((u) => u.id === idParam(params))) fail(404, `Unidad ${params.id} no existe`)
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
    if (index < 0) fail(404, `Proveedor ${params.id} no existe`)
    const supplier = touch(buildSupplier((await request.json()) as SupplierRequest, db.suppliers[index], user.username), user.username)
    db.suppliers[index] = supplier
    for (const p of db.products) if (p.supplier?.id === supplier.id) p.supplier = { id: supplier.id, name: supplier.name }
    return HttpResponse.json(supplier)
  })),

  http.delete(url('/suppliers/:id'), guarded('partners:write', ({ params }) => {
    const db = getDb()
    if (!db.suppliers.some((s) => s.id === idParam(params))) fail(404, `Proveedor ${params.id} no existe`)
    if (db.products.some((p) => p.supplier?.id === idParam(params))) {
      fail(409, 'El proveedor tiene productos asociados; desactivalo en lugar de eliminarlo')
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
    const role = db.roles.find((r) => r.id === body.roleId) ?? fail(400, `El rol ${body.roleId} no existe`)
    const created: DemoUser = {
      id: nextId(), username: body.username, password: body.password, displayName: body.displayName.trim(),
      email: blank(body.email), role: { id: role.id, name: role.name }, enabled: body.enabled ?? true, audit: audit(user.username),
    }
    db.users.push(created)
    return HttpResponse.json(publicUser(created), { status: 201 })
  })),

  http.put(url('/users/:id'), guarded('users:write', async ({ request, params, user }) => {
    const db = getDb()
    const target = db.users.find((u) => u.id === idParam(params)) ?? fail(404, `Usuario ${params.id} no existe`)
    const body = (await request.json()) as UpdateUserRequest
    const role = db.roles.find((r) => r.id === body.roleId) ?? fail(400, `El rol ${body.roleId} no existe`)
    if (target.id === user.id && (!body.enabled || role.id !== target.role.id)) fail(400, 'No podés desactivarte ni cambiar tu propio rol')
    Object.assign(target, { displayName: body.displayName.trim(), email: blank(body.email), role: { id: role.id, name: role.name }, enabled: body.enabled })
    if (body.password) target.password = body.password
    return HttpResponse.json(publicUser(touch(target, user.username)))
  })),

  http.delete(url('/users/:id'), guarded('users:write', ({ params, user }) => {
    const db = getDb()
    if (!db.users.some((u) => u.id === idParam(params))) fail(404, `Usuario ${params.id} no existe`)
    if (idParam(params) === user.id) fail(400, 'No podés eliminar tu propio usuario')
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
    const role = db.roles.find((r) => r.id === idParam(params)) ?? fail(404, `Rol ${params.id} no existe`)
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
    const role = db.roles.find((r) => r.id === idParam(params)) ?? fail(404, `Rol ${params.id} no existe`)
    if (role.system) fail(400, 'Los roles de sistema no se pueden eliminar')
    if (db.users.some((u) => u.role.id === role.id)) fail(409, 'El rol tiene usuarios asignados')
    db.roles = db.roles.filter((r) => r.id !== role.id)
    return new HttpResponse(null, { status: 204 })
  })),
]

function validateRole(body: RoleRequest) {
  requireFields({ name: (!body.name || !/^[A-Z0-9_]+$/.test(body.name)) && 'mayúsculas, números y guion bajo' })
  const unknown = body.permissions.filter((p) => !ALL_PERMISSIONS.includes(p))
  if (unknown.length > 0) fail(400, `Permisos desconocidos: ${unknown.join(', ')}`)
}
