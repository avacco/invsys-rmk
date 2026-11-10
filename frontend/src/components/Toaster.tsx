import { CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToasts } from '@/store/toast'

export function Toaster() {
  const { t } = useTranslation()
  const { toasts, dismiss } = useToasts()
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => dismiss(toast.id)}
          className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-3 text-left text-sm text-white shadow-lg ${toast.kind === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.kind === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
          {t(toast.message)}
        </button>
      ))}
    </div>
  )
}
