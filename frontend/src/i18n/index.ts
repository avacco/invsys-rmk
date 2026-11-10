import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en } from './en'

/**
 * Traducciones estilo gettext: el texto en español es la clave, y en.ts lo traduce al inglés.
 * Así el código se lee en el idioma original y una clave faltante muestra el español, nunca un id.
 */
export const LANGUAGES = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
] as const
export type Language = (typeof LANGUAGES)[number]['code']

/** Marca un texto para traducir más tarde con t() (listas, mensajes de validación, etiquetas). */
export const tk = <T extends string>(text: T): T => text

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: {} }, en: { translation: en } },
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    load: 'languageOnly',
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'invsys-lang', caches: ['localStorage'] },
  })

const syncHtmlLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng
}
syncHtmlLang(i18n.resolvedLanguage ?? 'es')
i18n.on('languageChanged', syncHtmlLang)

export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'en' ? 'en' : 'es'
}

export default i18n
