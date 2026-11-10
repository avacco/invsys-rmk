import { describe, expect, it } from 'vitest'
import { toCsv, toCsvCell } from './csv'

describe('CSV', () => {
  it('neutraliza fórmulas', () => {
    expect(toCsvCell('=SUM(A1:A9)')).toBe(`"'=SUM(A1:A9)"`)
    expect(toCsvCell('+54 11')).toBe(`"'+54 11"`)
    expect(toCsvCell('@cmd')).toBe(`"'@cmd"`)
  })

  it('escapa comillas y valores vacíos', () => {
    expect(toCsvCell('Tornillo 1/4"')).toBe('"Tornillo 1/4"""')
    expect(toCsvCell(null)).toBe('""')
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('"a","b"\r\n"1","x"')
  })
})
