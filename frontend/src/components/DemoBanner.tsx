import { Info, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { isDemo } from '@/lib/demo'

/** Aviso visible en modo demo, con opción de volver a los datos iniciales. */
export function DemoBanner() {
  const { t } = useTranslation()
  if (!isDemo) return null
  const reset = async () => {
    const { resetDemoData } = await import('@/mocks/db')
    resetDemoData()
    window.location.reload()
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
      <span className="flex items-center gap-2">
        <Info className="h-4 w-4" />
        {t('Modo demostración: los datos son ficticios y se guardan solo en este navegador.')}
      </span>
      <button type="button" onClick={() => void reset()} className="flex cursor-pointer items-center gap-1 font-semibold underline">
        <RotateCcw className="h-3.5 w-3.5" /> {t('Restablecer datos')}
      </button>
    </div>
  )
}
