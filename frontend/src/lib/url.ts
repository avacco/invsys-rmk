/**
 * Devuelve la URL solo si es segura para usar en <img>: rutas relativas, http(s), blob: o data:image.
 * Cualquier otro esquema (javascript:, data:text/html...) se descarta.
 */
export function safeImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (/^data:image\/(png|jpe?g|gif|webp);/i.test(trimmed)) return trimmed
  try {
    const parsed = new URL(trimmed, window.location.origin)
    if (['http:', 'https:', 'blob:'].includes(parsed.protocol)) return parsed.href
  } catch {
    // URL inválida
  }
  return ''
}
