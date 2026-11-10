/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    // Ruta base del sitio publicado (p. ej. "/invsys/" en GitHub Pages).
    base: env.BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 3000,
      // En desarrollo la API se sirve desde el mismo origen: las cookies httpOnly funcionan sin CORS.
      proxy: {
        '/api': env.API_PROXY_TARGET || 'http://localhost:8080',
        '/files': env.API_PROXY_TARGET || 'http://localhost:8080',
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Dependencias en chunks propios: el navegador las cachea entre versiones de la app.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router'],
            data: ['@tanstack/react-query', 'react-hook-form', '@hookform/resolvers', 'zod'],
            i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
