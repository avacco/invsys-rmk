import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiError } from '@/api/client'
import { tk } from '@/i18n'
import { toast } from '@/store/toast'

/** Muestra un error de la API: los errores de campo van al formulario, el resto a un toast. */
export function handleApiError<T extends FieldValues>(error: unknown, setError?: UseFormSetError<T>) {
  if (error instanceof ApiError) {
    const fields = Object.entries(error.fieldErrors)
    if (setError && fields.length > 0) {
      for (const [field, message] of fields) setError(field as Path<T>, { message })
      return
    }
    toast.error(error.message)
    return
  }
  toast.error(tk('Ocurrió un error inesperado'))
}
