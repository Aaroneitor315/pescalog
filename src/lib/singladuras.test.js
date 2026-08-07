import { describe, it, expect } from 'vitest'
import {
  calcularSingladuras,
  calcularDiasEmbarcados,
  diffEnDiasCalendario,
  sumarSingladuras,
  sumarSingladurasSinSolape,
} from './singladuras.js'

describe('calcularSingladuras — inclusivo de fechas de calendario', () => {
  it('sale 01/01 23:50, llega 03/01 00:10 → 3', () => {
    expect(calcularSingladuras('2025-01-01T23:50', '2025-01-03T00:10')).toBe(3)
  })

  it('sale y llega el mismo día → 1', () => {
    expect(calcularSingladuras('2025-03-10', '2025-03-10')).toBe(1)
    expect(calcularSingladuras('2025-03-10T06:00', '2025-03-10T22:00')).toBe(1)
  })

  it('sale 10/03, llega 15/03 → 6', () => {
    expect(calcularSingladuras('2025-03-10', '2025-03-15')).toBe(6)
  })

  it('devuelve 0 si faltan fechas', () => {
    expect(calcularSingladuras('', '2025-03-15')).toBe(0)
    expect(calcularSingladuras('2025-03-10', '')).toBe(0)
    expect(calcularSingladuras(null, null)).toBe(0)
  })

  it('devuelve 0 si la llegada es anterior a la salida', () => {
    expect(calcularSingladuras('2025-03-15', '2025-03-10')).toBe(0)
  })

  it('acepta objetos Date', () => {
    expect(calcularSingladuras(new Date(2025, 2, 10), new Date(2025, 2, 15))).toBe(6)
  })
})

describe('calcularDiasEmbarcados — período completo, inclusivo', () => {
  it('embarco 01/06, desembarco 30/06 → 30', () => {
    expect(calcularDiasEmbarcados('2025-06-01', '2025-06-30')).toBe(30)
  })

  it('mismo día → 1', () => {
    expect(calcularDiasEmbarcados('2025-06-01', '2025-06-01')).toBe(1)
  })

  it('período abierto (sin desembarco) → 0', () => {
    expect(calcularDiasEmbarcados('2025-06-01', '')).toBe(0)
  })
})

describe('diffEnDiasCalendario', () => {
  it('ignora la hora', () => {
    expect(diffEnDiasCalendario('2025-01-01T23:50', '2025-01-03T00:10')).toBe(2)
  })
  it('mismo día → 0', () => {
    expect(diffEnDiasCalendario('2025-01-01', '2025-01-01')).toBe(0)
  })
})

describe('sumas de singladuras', () => {
  const viajes = [
    { fechaSalida: '2025-03-10', fechaRegreso: '2025-03-15' }, // 6
    { fechaSalida: '2025-03-20', fechaRegreso: '2025-03-22' }, // 3
  ]

  it('sumarSingladuras suma cada viaje independiente', () => {
    expect(sumarSingladuras(viajes)).toBe(9)
  })

  it('sin solape: descuenta el día compartido en el borde', () => {
    // viaje A llega 15/03, viaje B sale 15/03 → el 15 no se cuenta dos veces
    const consecutivos = [
      { fechaSalida: '2025-03-10', fechaRegreso: '2025-03-15' }, // 6
      { fechaSalida: '2025-03-15', fechaRegreso: '2025-03-18' }, // 4
    ]
    expect(sumarSingladuras(consecutivos)).toBe(10)           // sin ajuste
    expect(sumarSingladurasSinSolape(consecutivos)).toBe(9)   // −1 por el 15
  })

  it('sin solape: no descuenta si no comparten día', () => {
    expect(sumarSingladurasSinSolape(viajes)).toBe(9)
  })
})
