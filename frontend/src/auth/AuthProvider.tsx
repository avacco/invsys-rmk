import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setSessionExpiredHandler } from '@/api/client'
import { authApi, metaApi } from '@/api/endpoints'
import type { Me, PermissionValue } from '@/api/types'
import { setCurrency } from '@/lib/format'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<Me | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  const clearSession = useCallback(() => {
    setUser(null)
    setStatus('anonymous')
    queryClient.clear()
  }, [queryClient])

  // Al cargar la app se intenta restaurar la sesión con el refresh token (cookie httpOnly).
  useEffect(() => {
    let cancelled = false
    metaApi.get().then((meta) => setCurrency(meta.currency)).catch(() => undefined)
    authApi
      .refresh()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSessionExpiredHandler(clearSession)
    return () => setSessionExpiredHandler(null)
  }, [clearSession])

  const login = useCallback(async (username: string, password: string) => {
    const me = await authApi.login({ username, password })
    setUser(me)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const can = useCallback(
    (permission: PermissionValue) => user?.permissions.includes(permission) ?? false,
    [user],
  )

  const value = useMemo(() => ({ user, status, login, logout, can }), [user, status, login, logout, can])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
