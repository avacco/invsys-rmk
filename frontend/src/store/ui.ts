import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface UiState {
  sidebarCollapsed: boolean
  darkMode: boolean
  productView: 'grid' | 'table'
  toggleSidebar: () => void
  setSidebarCollapsed: (value: boolean) => void
  toggleDarkMode: () => void
  setProductView: (view: 'grid' | 'table') => void
}

/** Preferencias de interfaz, persistidas en localStorage. */
export const useUi = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      darkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
      productView: 'grid',
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setProductView: (productView) => set({ productView }),
    }),
    { name: 'invsys-ui', storage: createJSONStorage(() => localStorage) },
  ),
)
