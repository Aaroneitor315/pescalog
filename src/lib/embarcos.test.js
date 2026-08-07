import { describe, it, expect } from 'vitest'
import { agruparEmbarcos, validarPeriodo } from './embarcos.js'

describe('agruparEmbarcos', () => {
  const viajes = [
    // Período A — Don Hector, embarco 01/03, cerrado 20/03
    { id: 'a1', barco: 'Don Hector', fechaEmbarco: '2025-03-01', fechaSalida: '2025-03-02', fechaRegreso: '2025-03-06', fechaDesembarco: '' },
    { id: 'a2', barco: 'Don Hector', fechaEmbarco: '2025-03-01', fechaSalida: '2025-03-08', fechaRegreso: '2025-03-12', fechaDesembarco: '' },
    { id: 'a3', barco: 'Don Hector', fechaEmbarco: '2025-03-01', fechaSalida: '2025-03-14', fechaRegreso: '2025-03-19', fechaDesembarco: '2025-03-20' },
    // Período B — Siempre Lucas, embarco 05/04, ABIERTO
    { id: 'b1', barco: 'Siempre Lucas', fechaEmbarco: '2025-04-05', fechaSalida: '2025-04-06', fechaRegreso: '2025-04-10', fechaDesembarco: '' },
  ]

  const periodos = agruparEmbarcos(viajes)

  it('agrupa en 2 períodos', () => {
    expect(periodos).toHaveLength(2)
  })

  it('ordena más reciente primero (Siempre Lucas antes que Don Hector)', () => {
    expect(periodos[0].barco).toBe('Siempre Lucas')
    expect(periodos[1].barco).toBe('Don Hector')
  })

  it('marca cerrado/abierto correctamente', () => {
    const donHector = periodos.find(p => p.barco === 'Don Hector')
    const lucas = periodos.find(p => p.barco === 'Siempre Lucas')
    expect(donHector.cerrado).toBe(true)
    expect(donHector.fechaDesembarco).toBe('2025-03-20')
    expect(lucas.cerrado).toBe(false)
  })

  it('agrupa los 3 viajes del período A', () => {
    const donHector = periodos.find(p => p.barco === 'Don Hector')
    expect(donHector.viajes).toHaveLength(3)
  })

  it('total días embarcado del período cerrado = 20 (01/03→20/03)', () => {
    const donHector = periodos.find(p => p.barco === 'Don Hector')
    expect(donHector.totalDiasEmbarcado).toBe(20)
  })

  it('total singladuras suma los 3 viajes (5+5+6=16, sin solapes)', () => {
    const donHector = periodos.find(p => p.barco === 'Don Hector')
    expect(donHector.totalSingladuras).toBe(16)
  })
})

describe('validarPeriodo', () => {
  it('período abierto → error de desembarco', () => {
    const { ok, errores } = validarPeriodo({ cerrado: false, viajes: [{ fechaSalida: '2025-04-06', fechaRegreso: '2025-04-10' }] })
    expect(ok).toBe(false)
    expect(errores.some(e => /desembarco/i.test(e))).toBe(true)
  })

  it('período cerrado y válido → ok', () => {
    const { ok } = validarPeriodo({
      cerrado: true,
      viajes: [{ fechaSalida: '2025-03-02', fechaRegreso: '2025-03-06' }],
    })
    expect(ok).toBe(true)
  })

  it('viaje con regreso anterior a salida → error', () => {
    const { ok, errores } = validarPeriodo({
      cerrado: true,
      viajes: [{ fechaSalida: '2025-03-10', fechaRegreso: '2025-03-05' }],
    })
    expect(ok).toBe(false)
    expect(errores.some(e => /anterior/i.test(e))).toBe(true)
  })
})
