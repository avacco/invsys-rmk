import { Suspense, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { ArrowLeftRight, BarChart3, Boxes, ClipboardList, History, Home, LogOut, Menu, Moon, Package, ShieldCheck, Sun, Truck, Users, Warehouse, X, type LucideIcon } from 'lucide-react'
import type { PermissionValue } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { useUi } from '@/store/ui'
import { Button, Spinner } from './ui'
import { DemoBanner } from './DemoBanner'
import { Toaster } from './Toaster'
import logo from '@/assets/invsys.png'
import logoDark from '@/assets/invsys-dark.png'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  permission?: PermissionValue
}

const NAV: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/inventory', label: 'Stock', icon: ClipboardList, permission: 'inventory:read' },
  { to: '/inventory/movements', label: 'Movimientos', icon: ArrowLeftRight, permission: 'inventory:read' },
  { to: '/reports', label: 'Reportes', icon: BarChart3, permission: 'inventory:read' },
  { to: '/products', label: 'Productos', icon: Package, permission: 'catalog:read' },
  { to: '/catalog', label: 'Categorías y unidades', icon: Boxes, permission: 'catalog:read' },
  { to: '/warehouses', label: 'Almacenes', icon: Warehouse, permission: 'inventory:read' },
  { to: '/suppliers', label: 'Proveedores', icon: Truck, permission: 'partners:read' },
  { to: '/users', label: 'Usuarios', icon: Users, permission: 'users:read' },
  { to: '/roles', label: 'Roles y permisos', icon: ShieldCheck, permission: 'roles:read' },
  { to: '/audit', label: 'Auditoría', icon: History, permission: 'audit:read' },
]

export function Layout() {
  const { user, can, logout } = useAuth()
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, darkMode, toggleDarkMode } = useUi()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  const closeOnMobile = () => {
    if (window.innerWidth < 768) setSidebarCollapsed(true)
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-950 ${sidebarCollapsed ? 'w-0 md:w-16' : 'w-64'}`}
        aria-label="Navegación principal"
      >
        <div className={`flex items-center gap-3 py-6 ${sidebarCollapsed ? 'justify-center px-2' : 'px-6'}`}>
          <img src={darkMode ? logoDark : logo} alt="" className="h-9 w-9 shrink-0" />
          {!sidebarCollapsed && <span className="text-xl font-extrabold tracking-wide text-blue-900 dark:text-gray-100">INVSYS</span>}
          {!sidebarCollapsed && (
            <Button variant="ghost" className="ml-auto px-2 md:hidden" aria-label="Cerrar menú" onClick={toggleSidebar} icon={<X className="h-5 w-5" />} />
          )}
        </div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV.filter((item) => !item.permission || can(item.permission)).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/inventory'}
              onClick={closeOnMobile}
              title={sidebarCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors ${sidebarCollapsed ? 'justify-center' : ''} ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
        {!sidebarCollapsed && <p className="pb-6 text-center text-xs text-gray-400">Invsys · demo de portfolio</p>}
      </aside>

      <div className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? 'md:pl-16' : 'md:pl-64'}`}>
        <DemoBanner />
        <header className="flex items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 sm:px-8">
          <Button variant="ghost" className="px-2" aria-label="Mostrar u ocultar menú" onClick={toggleSidebar} icon={<Menu className="h-5 w-5" />} />
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" className="px-2" aria-label="Cambiar tema" onClick={toggleDarkMode}
              icon={darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />} />
            <div className="hidden text-right sm:block">
              <p className="font-semibold leading-tight">{user?.displayName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{user?.role}</p>
            </div>
            <Button variant="ghost" className="px-2" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => void logout()}
              icon={<LogOut className="h-5 w-5" />} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-8">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
