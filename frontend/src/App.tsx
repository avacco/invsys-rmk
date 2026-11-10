import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from './lib/queryClient'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth, RequirePermission } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { EmptyState } from './components/ui'
import LoginPage from './features/auth/LoginPage'

const HomePage = lazy(() => import('./features/home/HomePage'))
const ProductsPage = lazy(() => import('./features/products/ProductsPage'))
const CatalogPage = lazy(() => import('./features/catalog/CatalogPage'))
const SuppliersPage = lazy(() => import('./features/suppliers/SuppliersPage'))
const UsersPage = lazy(() => import('./features/users/UsersPage'))
const RolesPage = lazy(() => import('./features/roles/RolesPage'))
const StockPage = lazy(() => import('./features/inventory/StockPage'))
const MovementsPage = lazy(() => import('./features/inventory/MovementsPage'))
const WarehousesPage = lazy(() => import('./features/warehouses/WarehousesPage'))

const queryClient = createQueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="inventory" element={<RequirePermission permission="inventory:read"><StockPage /></RequirePermission>} />
                <Route path="inventory/movements" element={<RequirePermission permission="inventory:read"><MovementsPage /></RequirePermission>} />
                <Route path="warehouses" element={<RequirePermission permission="inventory:read"><WarehousesPage /></RequirePermission>} />
                <Route path="products" element={<RequirePermission permission="catalog:read"><ProductsPage /></RequirePermission>} />
                <Route path="catalog" element={<RequirePermission permission="catalog:read"><CatalogPage /></RequirePermission>} />
                <Route path="suppliers" element={<RequirePermission permission="partners:read"><SuppliersPage /></RequirePermission>} />
                <Route path="users" element={<RequirePermission permission="users:read"><UsersPage /></RequirePermission>} />
                <Route path="roles" element={<RequirePermission permission="roles:read"><RolesPage /></RequirePermission>} />
                <Route path="*" element={<EmptyState title="Página no encontrada" description="La dirección no existe." />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
