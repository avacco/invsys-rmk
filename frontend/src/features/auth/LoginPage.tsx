import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { Button, Field, Input, Spinner } from '@/components/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { isDemo } from '@/lib/demo'
import logo from '@/assets/invsys.png'
import { useTranslation } from 'react-i18next'
import { tk } from '@/i18n'

const schema = z.object({
  username: z.string().trim().min(1, tk('Ingresa tu usuario')),
  password: z.string().min(1, tk('Ingresa tu contraseña')),
})
type FormValues = z.infer<typeof schema>

const DEMO_USERS = [
  { username: 'admin', password: 'admin1234', role: tk('Administrador') },
  { username: 'manager', password: 'manager1234', role: tk('Gerente') },
  { username: 'viewer', password: 'viewer1234', role: tk('Solo lectura') },
]

export default function LoginPage() {
  const { t } = useTranslation()
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  if (status === 'loading') return <Spinner fullScreen />
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  const onSubmit = async (values: FormValues) => {
    setError(null)
    try {
      await login(values.username, values.password)
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true })
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? t('Usuario o contraseña incorrectos') : t('No se pudo conectar con el servidor'))
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 p-4 dark:from-gray-900 dark:to-gray-950">
      <div className="absolute right-4 top-4"><LanguageSwitcher /></div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src={logo} alt="" className="h-16 w-16" />
          <h1 className="text-2xl font-extrabold tracking-wide text-blue-900 dark:text-gray-100">{t('INVSYS')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('Gestión de inventario')}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Field label={t('Nombre de usuario')} htmlFor="username" error={errors.username?.message}>
            <Input id="username" autoComplete="username" autoFocus {...register('username')} />
          </Field>
          <Field label={t('Contraseña')} htmlFor="password" error={errors.password?.message}>
            <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{t(error)}</p>}
          <Button type="submit" loading={isSubmitting} className="mt-2 w-full">{t('Ingresar')}</Button>
        </form>
        {isDemo && (
          <div className="mt-6 rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
            <p className="mb-2 font-semibold">{t('Demo: elige un usuario para completar el formulario')}</p>
            <div className="flex flex-col gap-1">
              {DEMO_USERS.map((u) => (
                <button key={u.username} type="button" className="cursor-pointer text-left hover:underline"
                  onClick={() => { setValue('username', u.username); setValue('password', u.password) }}>
                  <span className="font-mono">{u.username}</span> / <span className="font-mono">{u.password}</span> — {t(u.role)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
