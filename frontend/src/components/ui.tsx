import { forwardRef, useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react'

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ')

// --- Botones ---

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', loading, icon, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors cursor-pointer disabled:cursor-not-allowed', variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// --- Formularios ---

const inputBase =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cx(inputBase, className)} {...props} />,
)
Input.displayName = 'Input'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cx(inputBase, className)} {...props}>
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cx(inputBase, className)} {...props} />,
)
Textarea.displayName = 'Textarea'

export function Field({ label, error, htmlFor, children, className }: {
  label: string
  error?: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
      {children}
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" aria-label={placeholder} />
    </div>
  )
}

// --- Estructura ---

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">{title}</h1>
        {description && <p className="mt-1 text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800', className)}>{children}</div>
}

export function Badge({ tone = 'gray', children }: { tone?: 'gray' | 'green' | 'red' | 'blue' | 'amber'; children: ReactNode }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  }
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
}

export function Spinner({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div className={cx('flex items-center justify-center', fullScreen ? 'min-h-screen' : 'py-16')} role="status" aria-label="Cargando">
      <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
    </div>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500 dark:text-gray-400">
      <p className="text-lg font-medium">{title}</p>
      {description && <p>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <EmptyState
      title="No se pudieron cargar los datos"
      description={error instanceof Error ? error.message : undefined}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>Reintentar</Button>}
    />
  )
}

export function Pagination({ page, totalPages, totalElements, onChange }: {
  page: number
  totalPages: number
  totalElements: number
  onChange: (page: number) => void
}) {
  if (totalElements === 0) return null
  return (
    <div className="mt-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
      <span>{totalElements} resultado{totalElements === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <Button variant="ghost" aria-label="Página anterior" disabled={page <= 0} onClick={() => onChange(page - 1)} icon={<ChevronLeft className="h-4 w-4" />} />
        <span>Página {page + 1} de {Math.max(totalPages, 1)}</span>
        <Button variant="ghost" aria-label="Página siguiente" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)} icon={<ChevronRight className="h-4 w-4" />} />
      </div>
    </div>
  )
}

// --- Diálogos ---

export function Modal({ open, title, onClose, children, footer, size = 'md' }: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={cx('flex max-h-[90vh] w-full flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800', size === 'lg' ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" className="px-2" aria-label="Cerrar" onClick={onClose} icon={<X className="h-5 w-5" />} />
        </div>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Eliminar', loading, onConfirm, onCancel }: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onCancel}
      footer={<>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </>}>
      <p className="text-gray-600 dark:text-gray-300">{message}</p>
    </Modal>
  )
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="min-w-full divide-y divide-gray-200 text-left dark:divide-gray-700">{children}</table>
    </div>
  )
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th scope="col" className={cx('bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400', className)}>{children}</th>
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cx('px-4 py-3 text-gray-700 dark:text-gray-200', className)}>{children}</td>
}
