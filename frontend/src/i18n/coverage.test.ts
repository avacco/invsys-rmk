import { describe, expect, it } from 'vitest'
import { en } from './en'

/**
 * Revisa el código fuente: todo texto visible debe pasar por t() / tk() (o por un componente que traduce),
 * y cada texto marcado debe tener su traducción al inglés.
 */
const sources = import.meta.glob(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}', '!/src/test/**', '!/src/i18n/en.ts'],
  { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const LETTER = /[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡]/
const unescape = (s: string) => s.replace(/\\'/g, "'")

/** Textos que se muestran tal cual en cualquier idioma. */
const UNTRANSLATED = new Set(['SKU', 'CSV', 'ID', 'INVSYS', 'OK', 'Email', 'AUDITOR', 'Stock', 'Español', 'English', 'Total'])

function collectKeys(code: string): string[] {
  const keys: string[] = []
  for (const m of code.matchAll(/(?<![\w.])(?:t|tk|i18n\.t)\('((?:[^'\\]|\\.)*)'/g)) keys.push(unescape(m[1]))
  // Mensajes del backend simulado: fail()/problem() y errores por campo de requireFields.
  for (const m of code.matchAll(/(?:fail|problem)\(\d+, \[?'((?:[^'\\]|\\.)*)'/g)) keys.push(unescape(m[1]))
  for (const m of code.matchAll(/&& '((?:[^'\\]|\\.)*)'/g)) keys.push(unescape(m[1]))
  for (const m of code.matchAll(/toast\.(?:success|error)\('((?:[^'\\]|\\.)*)'/g)) keys.push(unescape(m[1]))
  return keys.filter((k) => LETTER.test(k) && !UNTRANSLATED.has(k))
}

describe('i18n', () => {
  const files = Object.entries(sources)

  it('todo texto marcado para traducir tiene su versión en inglés', () => {
    const missing = new Set<string>()
    for (const [, code] of files) for (const key of collectKeys(code)) if (!(key in en)) missing.add(key)
    expect([...missing].sort()).toEqual([])
  })

  it('no hay texto visible sin marcar en los componentes', () => {
    const raw: string[] = []
    for (const [file, code] of files.filter(([f]) => f.endsWith('.tsx'))) {
      for (const m of code.matchAll(/>\s*([^<>{}=;`[\]\n()]*[A-Za-zÁÉÍÓÚáéíóúñ¿¡][^<>{}=;`[\]\n]*?)\s*</g)) {
        if (!UNTRANSLATED.has(m[1].trim()) && !/^([:?]|return\b|if\b)/.test(m[1].trim())) raw.push(`${file}: ${m[1].trim()}`)
      }
      // Texto pegado a una expresión: "Costo {precio}" o "{n} resultados".
      const withoutStrings = code.replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
      for (const m of withoutStrings.matchAll(/(?:>|\})([ \t]*[A-Za-zÁÉÍÓÚáéíóúñ¿¡][^<>{}=;`[\]\n()]*?)[ \t]*\{/g)) {
        const text = m[1].trim()
        if (text && !text.includes("'") && !/^(return|if|else|const|let|export|function|import|catch|try|finally)\b/.test(text) && !UNTRANSLATED.has(text)) raw.push(`${file}: ${text} {…}`)
      }
      // Literales con varias palabras fuera de t()/tk() (p. ej. {cond ? 'Texto' : 'Otro'}).
      for (const line of code.split('\n')) {
        if (/className|import |queryKey|\.test\(|console\./.test(line)) continue
        for (const m of line.matchAll(/(?<![\w.(])'([A-Za-zÁÉÍÓÚáéíóúñ¿¡][^'\n]* [^'\n]*)'/g)) {
          const before = line.slice(0, m.index)
          const cssClasses = m[1].split(' ').every((w) => /^[a-z0-9:/.[\]-]+$/.test(w)) && m[1].includes('-')
          if (!cssClasses && !/(?:\bt|\btk|i18n\.t)\($/.test(before) && !UNTRANSLATED.has(m[1])) raw.push(`${file}: '${m[1]}'`)
        }
      }
      for (const m of code.matchAll(/\b(?:aria-label|placeholder|title|label|description|confirmLabel|name)="([^"]*[A-Za-zÁÉÍÓÚáéíóúñ][^"]*)"/g)) {
        if (!UNTRANSLATED.has(m[1])) raw.push(`${file}: ${m[0]}`)
      }
    }
    expect(raw).toEqual([])
  })

  it('las traducciones conservan las variables', () => {
    const vars = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
    const broken = Object.entries(en).filter(([es, text]) => vars(es).join() !== vars(text).join())
    expect(broken).toEqual([])
  })
})
