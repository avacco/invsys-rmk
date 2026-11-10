import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '@/i18n'

/** Selector de idioma. La elección se guarda en el navegador y se envía al backend en cada petición. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  return (
    <label className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
      <Languages className="h-5 w-5" aria-hidden />
      <span className="sr-only">{t('Idioma')}</span>
      <select
        value={i18n.resolvedLanguage}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        className="cursor-pointer rounded-md bg-transparent py-1 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  )
}
