import type { ProblemDetail } from './types'

/** Error de la API con el detalle RFC 9457 ya parseado. */
export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Record<string, string>

  constructor(status: number, problem?: Partial<ProblemDetail>) {
    super(problem?.detail || problem?.title || `Error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = problem?.errors ?? {}
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: Query
  body?: unknown
  /** Evita el reintento con refresh (lo usan las propias rutas de autenticación). */
  skipRefresh?: boolean
}

export const API_BASE: string = import.meta.env.VITE_API_BASE || '/api/v1'
const BASE = API_BASE

let onSessionExpired: (() => void) | null = null
let refreshing: Promise<boolean> | null = null

/** Registra qué hacer cuando la sesión no se puede renovar (lo usa AuthProvider). */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

export function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`
  // URL absoluta: fetch fuera del navegador (tests) no acepta rutas relativas.
  return new URL(url, window.location.origin).toString()
}

async function send(path: string, opts: RequestOptions): Promise<Response> {
  const isForm = opts.body instanceof FormData
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    credentials: 'same-origin',
    headers: isForm || opts.body === undefined
      ? { Accept: 'application/json' }
      : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: isForm ? (opts.body as FormData) : opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
}

/** Renueva el access token una sola vez aunque varias peticiones fallen a la vez. */
function refreshSession(): Promise<boolean> {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

async function parseError(res: Response): Promise<ApiError> {
  let problem: Partial<ProblemDetail> | undefined
  try {
    problem = await res.json()
  } catch {
    problem = undefined
  }
  return new ApiError(res.status, problem)
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(path, opts)

  if (res.status === 401 && !opts.skipRefresh) {
    if (await refreshSession()) {
      res = await send(path, opts)
    }
    if (res.status === 401) {
      onSessionExpired?.()
    }
  }

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
