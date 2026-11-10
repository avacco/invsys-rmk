import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { isDemo } from './lib/demo'
import './i18n'
import './index.css'

/** En modo demo se inicia MSW antes de renderizar, para que ninguna petición llegue a la red. */
async function enableMocking() {
  if (!isDemo) return
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
    quiet: true,
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
