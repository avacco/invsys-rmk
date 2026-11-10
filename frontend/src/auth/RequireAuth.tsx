import { Navigate, Outlet, useLocation } from 'react-router'
import type { PermissionValue } from '@/api/types'
import { Spinner } from '@/components/ui'
import { useAuth } from './AuthContext'
import { useTranslation } from 'react-i18next'

/** Rutas privadas: espera a que se restaure la sesión y redirige a /login si no hay. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Spinner fullScreen />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Muestra el contenido solo si el usuario tiene el permiso; si no, un aviso de acceso denegado. */
export function RequirePermission({ permission, children }: { permission: PermissionValue; children: React.ReactNode }) {
  const { t } = useTranslation()
  const { can } = useAuth()
  if (!can(permission)) {
    return (
      <div className="mt-20 text-center text-gray-500 dark:text-gray-400">
        <p className="text-lg font-semibold">{t('Acceso denegado')}</p>
        <p>{t('Tu rol no tiene permiso para ver esta sección.')}</p>
      </div>
    )
  }
  return <>{children}</>
}
